import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LlmProvider } from '@/features/ai/lib/llm-client';
import type { ChatContextParams } from '@/features/ai/lib/prompt-templates';
import {
  AiServiceError,
  executeAiChatTurn,
} from '@/features/ai/lib/ai-chat-service';

interface AiChatRequestBody {
  prompt?: string;
  context?: ChatContextParams;
  teamId?: string;
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
        : process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
    caching: 'enabled',
  });
}

/**
 * POST /api/ai-chat
 *
 * Legacy alias route aligned with unified AI chat & cache isolation rules (Issue #43 / #149).
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

    // 2. Parse request payload
    let body: AiChatRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request: Format JSON tidak valid.' },
        { status: 400 }
      );
    }

    // 3. Execute unified chat turn with server-derived context & isolated cache
    const result = await executeAiChatTurn({
      supabase,
      user,
      prompt: body.prompt ?? '',
      clientContext: body.context,
      requestedTeamId: body.teamId,
      provider: body.provider,
    });

    if (result.isCached) {
      return NextResponse.json({
        success: true,
        reply: result.reply,
        isCached: true,
        queryHash: result.queryHash,
        provider: result.provider,
        model: result.model,
        cachedAt: result.cachedAt,
      });
    }

    return NextResponse.json({
      success: true,
      reply: result.reply,
      isCached: false,
      queryHash: result.queryHash,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
    });
  } catch (err) {
    if (err instanceof AiServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
        },
        { status: err.status }
      );
    }

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
