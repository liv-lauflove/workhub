'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/types/global';
import {
  generateQueryHash,
  getCachedAiResponse,
  saveCachedAiResponse,
} from '../queries/ai-cache.queries';
import { invokeLlm, type LlmProvider } from '../lib/llm-client';
import {
  DEFAULT_SYSTEM_PROMPT,
  buildSystemPromptWithContext,
  TASK_PRIORITY_PREDICTION_SYSTEM_PROMPT,
  buildTaskPriorityPrompt,
  type ChatContextParams,
} from '../lib/prompt-templates';
import type {
  TaskPriorityPredictionInput,
  TaskPriorityPredictionResult,
} from '../types/ai.types';
import {
  classifyRagIntent,
  buildRagPromptHeader,
} from '../rag/knowledge-extractor';
import { getSanitizedTeamWorkloadContext } from '../rag/workload-aggregator';

export interface SendAiChatMessageInput {
  prompt: string;
  context?: ChatContextParams;
  provider?: LlmProvider;
}

export interface SendAiChatMessageOutput {
  reply: string;
  isCached: boolean;
  provider: string;
  model: string;
  cachedAt?: string;
}

/**
 * Server action to handle user chat messages sent to the AI assistant.
 * Performs user authentication, cache-first lookup to save LLM billing,
 * and calls the configured LLM provider when cache misses (Issue #43).
 */
export async function sendAiChatMessageAction(
  input: SendAiChatMessageInput
): Promise<ActionState<SendAiChatMessageOutput>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: {
          _form: [
            'Unauthorized: You must be signed in to use the AI assistant.',
          ],
        },
      };
    }

    const trimmedPrompt = input.prompt?.trim();
    if (!trimmedPrompt) {
      return {
        success: false,
        error: { prompt: ['Prompt cannot be empty.'] },
      };
    }

    if (trimmedPrompt.length > 4000) {
      return {
        success: false,
        error: {
          prompt: ['Prompt exceeds maximum allowed length of 4000 characters.'],
        },
      };
    }

    // Step 1: Classify RAG query intent (Schema, Workflow, or Live Workload)
    const { category, requiresWorkload } = classifyRagIntent(trimmedPrompt);

    // Step 2: Check PostgreSQL query cache for static/schema queries (bypass for real-time workload)
    const queryHash = generateQueryHash(trimmedPrompt, 'eng-manager');
    if (!requiresWorkload) {
      const cached = await getCachedAiResponse(queryHash);
      if (cached) {
        return {
          success: true,
          data: {
            reply: cached.responseText,
            isCached: true,
            provider: 'cache',
            model: 'postgres-ai-query-cache',
            cachedAt: cached.createdAt,
          },
        };
      }
    }

    // Step 3: Retrieve Knowledge Base & Live Sanitized Workload (Issue #97)
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single();
    const targetTeamId = profile?.team_id || undefined;

    const ragKnowledgeHeader = buildRagPromptHeader(trimmedPrompt);
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
      input.context
    );

    const systemPrompt = `${basePromptWithContext}${ragKnowledgeHeader}${workloadBlock}`;

    // Step 4: Invoke LLM provider
    const llmResult = await invokeLlm({
      prompt: trimmedPrompt,
      systemPrompt,
      provider: input.provider,
    });

    // Step 5: Persist successful response in PostgreSQL cache if static query
    if (!requiresWorkload) {
      await saveCachedAiResponse({
        queryHash,
        queryText: trimmedPrompt,
        responseText: llmResult.text,
      });
    }

    return {
      success: true,
      data: {
        reply: llmResult.text,
        isCached: false,
        provider: llmResult.provider,
        model: llmResult.model,
      },
    };
  } catch (error) {
    console.error('Error in sendAiChatMessageAction:', error);
    let message =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred while communicating with the AI service.';

    const lower = message.toLowerCase();
    if (
      lower.includes('timeout') ||
      lower.includes('aborted') ||
      (error instanceof DOMException && error.name === 'TimeoutError')
    ) {
      message =
        'Permintaan ke penyedia AI melebihi batas waktu (timeout). Silakan coba kirim ulang pertanyaan Anda.';
    }

    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

import {
  parsePredictionOutput,
  generateFallbackPrediction,
} from '../lib/task-prioritizing';

export { generateFallbackPrediction };

/**
 * Server action to predict task priority and duration from title & description (Issue #45).
 * Queries PostgreSQL cache first, falls back to LLM inference or instant heuristic evaluation.
 */
export async function predictTaskPriorityAction(
  input: TaskPriorityPredictionInput
): Promise<ActionState<TaskPriorityPredictionResult>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: {
          _form: ['Unauthorized: Silakan masuk untuk menggunakan asisten AI.'],
        },
      };
    }

    const trimmedTitle = input.title?.trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      return {
        success: false,
        error: {
          title: [
            'Judul tugas minimal 3 karakter untuk memprediksi prioritas.',
          ],
        },
      };
    }

    const promptText = buildTaskPriorityPrompt({
      title: trimmedTitle,
      description: input.description,
      columnName: input.columnName,
      isCsComplaint: input.isCsComplaint,
    });

    // 1. Check PostgreSQL query cache (hashed with priority-pred prefix)
    const queryHash = generateQueryHash(promptText, 'priority-pred');
    const cached = await getCachedAiResponse(queryHash);

    if (cached) {
      try {
        const parsed = JSON.parse(cached.responseText);
        if (parsed.suggestedPriority && parsed.estimatedDuration) {
          return {
            success: true,
            data: {
              ...parsed,
              isCached: true,
            },
          };
        }
      } catch {
        // Cached value wasn't valid JSON, continue to LLM invocation
      }
    }

    // 2. Invoke LLM with strict JSON system prompt
    const llmResult = await invokeLlm({
      prompt: promptText,
      systemPrompt: TASK_PRIORITY_PREDICTION_SYSTEM_PROMPT,
      temperature: 0.2,
      maxTokens: 300,
      timeoutMs: 15000,
    });

    // 3. Parse LLM response JSON safely
    const prediction = parsePredictionOutput(
      llmResult.text,
      trimmedTitle,
      input.isCsComplaint
    );

    // 4. Save result in PostgreSQL cache for instant identical queries
    await saveCachedAiResponse({
      queryHash,
      queryText: promptText,
      responseText: JSON.stringify(prediction),
    });

    return {
      success: true,
      data: {
        ...prediction,
        isCached: false,
      },
    };
  } catch (error) {
    console.error('Error in predictTaskPriorityAction:', error);
    // Graceful fallback heuristics so user experience in task dialog is never broken
    const fallback = generateFallbackPrediction(
      input.title || '',
      input.isCsComplaint
    );
    return {
      success: true,
      data: fallback,
    };
  }
}

/**
 * Backward compatibility placeholder.
 */
export async function placeholderAiAction() {
  return null;
}
