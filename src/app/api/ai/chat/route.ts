import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { invokeLlm } from '@/features/ai/lib/llm-client';
import {
  DEFAULT_SYSTEM_PROMPT,
  buildSystemPromptWithContext,
} from '@/features/ai/lib/prompt-templates';
import {
  classifyRagIntent,
  buildRagPromptHeader,
} from '@/features/ai/rag/knowledge-extractor';
import { getSanitizedTeamWorkloadContext } from '@/features/ai/rag/workload-aggregator';
import {
  generateQueryHash,
  getCachedAiResponse,
  saveCachedAiResponse,
} from '@/features/ai/queries/ai-cache.queries';

export interface ApiAiChatRequestBody {
  prompt: string;
  context?: {
    userName?: string;
    userRole?: string;
    teamName?: string;
    currentQuarter?: string;
  };
  teamId?: string;
  provider?: 'gemini' | 'openai';
}

/**
 * Route Handler for Workhub AI RAG Chatbot (Issue #97).
 * Endpoint: POST /api/ai/chat
 *
 * Implements schema-only RAG knowledge retrieval and sanitized team workload aggregation.
 * Zero direct raw database access by LLM.
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

    const body: ApiAiChatRequestBody = await request.json();
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt pertanyaan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    if (prompt.length > 4000) {
      return NextResponse.json(
        { error: 'Prompt melebihi batas maksimum 4000 karakter.' },
        { status: 400 }
      );
    }

    // Step 1: Classify RAG intent
    const { category, requiresWorkload } = classifyRagIntent(prompt);

    // Step 2: Check query cache for static/schema queries (bypass for real-time workload)
    const queryHash = generateQueryHash(prompt, 'eng-manager');
    if (!requiresWorkload) {
      const cached = await getCachedAiResponse(queryHash);
      if (cached) {
        return NextResponse.json({
          reply: cached.responseText,
          isCached: true,
          provider: 'cache',
          model: 'postgres-ai-query-cache',
          category,
          cachedAt: cached.createdAt,
        });
      }
    }

    // Step 3: Determine user team ID if workload context needed
    let targetTeamId = body.teamId;
    if (!targetTeamId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();
      targetTeamId = profile?.team_id || undefined;
    }

    // Step 4: Retrieve Knowledge Base & Sanitized Workload
    const ragKnowledgeHeader = buildRagPromptHeader(prompt);
    let workloadBlock = '';

    if (requiresWorkload || category === 'workload') {
      const workloadSummary =
        await getSanitizedTeamWorkloadContext(targetTeamId);
      if (workloadSummary?.formattedContextString) {
        workloadBlock = `\n\n${workloadSummary.formattedContextString}`;
      }
    }

    const basePromptWithContext = buildSystemPromptWithContext(
      DEFAULT_SYSTEM_PROMPT,
      body.context
    );

    const compositeSystemPrompt = `${basePromptWithContext}${ragKnowledgeHeader}${workloadBlock}`;

    // Step 5: Invoke LLM
    const llmResult = await invokeLlm({
      prompt,
      systemPrompt: compositeSystemPrompt,
      provider: body.provider,
    });

    // Step 6: Persist in cache if static query
    if (!requiresWorkload) {
      await saveCachedAiResponse({
        queryHash,
        queryText: prompt,
        responseText: llmResult.text,
      });
    }

    return NextResponse.json({
      reply: llmResult.text,
      isCached: false,
      provider: llmResult.provider,
      model: llmResult.model,
      category,
    });
  } catch (error) {
    console.error('Error in POST /api/ai/chat:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Terjadi kesalahan sistem saat memproses permintaan AI.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
