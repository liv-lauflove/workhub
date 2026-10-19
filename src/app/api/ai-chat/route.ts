import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateQueryHash,
  getCachedAiResponse,
  saveCachedAiResponse,
} from '@/features/ai/queries/ai-cache.queries';
import { invokeLlm, type LlmProvider } from '@/features/ai/lib/llm-client';
import {
  DEFAULT_SYSTEM_PROMPT,
  buildSystemPromptWithContext,
  type ChatContextParams,
} from '@/features/ai/lib/prompt-templates';

interface AiChatRequestBody {
  prompt?: string;
  context?: ChatContextParams;
  provider?: LlmProvider;
}

/**
 * GET /api/ai-chat
 * Health & configuration inspection for AI Chatbot service.
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/ai-chat',
    provider: process.env.AI_PROVIDER || 'gemini',
    model:
      process.env.AI_PROVIDER === 'openai'
        ? process.env.OPENAI_MODEL || 'gpt-4o-mini'
        : process.env.GEMINI_MODEL || 'gemini-flash-latest',
    caching: 'enabled',
  });
}

/**
 * POST /api/ai-chat
 *
 * Core endpoint for the AI Chatbot assistant (Issue #43).
 * Accepts user prompt, verifies authentication, checks the PostgreSQL query cache
 * for repeated questions, and queries LLM provider (Gemini/OpenAI) on cache miss.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            'Unauthorized: Sesi autentikasi tidak valid atau telah berakhir.',
        },
        { status: 401 }
      );
    }

    // 2. Parse & validate request payload
    let body: AiChatRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request: Format JSON tidak valid.' },
        { status: 400 }
      );
    }

    const trimmedPrompt = body.prompt?.trim();
    if (!trimmedPrompt) {
      return NextResponse.json(
        {
          error:
            'Bad Request: Kolom prompt wajib diisi dan tidak boleh kosong.',
        },
        { status: 400 }
      );
    }

    if (trimmedPrompt.length > 4000) {
      return NextResponse.json(
        {
          error:
            'Bad Request: Panjang prompt tidak boleh melebihi 4000 karakter.',
        },
        { status: 400 }
      );
    }

    // 3. Step 1: Check PostgreSQL query cache first (SHA-256 hash)
    const queryHash = generateQueryHash(trimmedPrompt, 'eng-manager');
    const cached = await getCachedAiResponse(queryHash);

    if (cached) {
      return NextResponse.json({
        success: true,
        reply: cached.responseText,
        isCached: true,
        queryHash: cached.queryHash,
        provider: 'cache',
        model: 'postgres-ai-query-cache',
        cachedAt: cached.createdAt,
      });
    }

    // 4. Fetch optional profile data if not fully passed in context
    let context = body.context;
    if (!context?.userName || !context?.userRole) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        context = {
          ...context,
          userName: context?.userName || profile.full_name || undefined,
          userRole: context?.userRole || profile.role || undefined,
        };
      }
    }

    // 5. Build contextual system prompt
    const systemPrompt = buildSystemPromptWithContext(
      DEFAULT_SYSTEM_PROMPT,
      context
    );

    // 6. Invoke LLM provider
    const llmResult = await invokeLlm({
      prompt: trimmedPrompt,
      systemPrompt,
      provider: body.provider,
    });

    // 7. Store response in PostgreSQL cache for future identical queries
    await saveCachedAiResponse({
      queryHash,
      queryText: trimmedPrompt,
      responseText: llmResult.text,
    });

    return NextResponse.json({
      success: true,
      reply: llmResult.text,
      isCached: false,
      queryHash,
      provider: llmResult.provider,
      model: llmResult.model,
      usage: llmResult.usage,
    });
  } catch (err) {
    console.error('Error handling /api/ai-chat request:', err);
    let message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan internal pada layanan AI.';

    const lower = message.toLowerCase();
    const isTimeout =
      lower.includes('timeout') ||
      lower.includes('aborted') ||
      (err instanceof DOMException && err.name === 'TimeoutError');

    if (isTimeout) {
      message =
        'Permintaan ke penyedia AI melebihi batas waktu (timeout). Silakan coba kirim ulang pertanyaan Anda.';
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
