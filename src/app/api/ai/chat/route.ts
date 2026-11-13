import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LlmProvider } from '@/features/ai/lib/llm-client';
import type { ChatContextParams } from '@/features/ai/lib/prompt-templates';
import {
  AiServiceError,
  executeAiChatTurn,
} from '@/features/ai/lib/ai-chat-service';

export interface ApiAiChatRequestBody {
  prompt: string;
  context?: ChatContextParams;
  teamId?: string;
  provider?: LlmProvider;
}

/**
 * Route Handler for Workhub AI RAG Chatbot (Issue #97 / #149).
 * Endpoint: POST /api/ai/chat
 *
 * Enforces server-derived identity context and owner-isolated query cache.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Harap login terlebih dahulu.' },
        { status: 401 }
      );
    }

    let body: ApiAiChatRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request: Format JSON tidak valid.' },
        { status: 400 }
      );
    }

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
        reply: result.reply,
        isCached: true,
        provider: result.provider,
        model: result.model,
        category: result.category,
        cachedAt: result.cachedAt,
      });
    }

    return NextResponse.json({
      reply: result.reply,
      isCached: false,
      provider: result.provider,
      model: result.model,
      category: result.category,
    });
  } catch (error) {
    if (error instanceof AiServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error in POST /api/ai/chat:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Terjadi kesalahan sistem saat memproses permintaan AI.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
