'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/types/global';
import {
  computeTextDigest,
  generateQueryHash,
  getCachedAiResponse,
  saveCachedAiResponse,
} from '../queries/ai-cache.queries';
import {
  invokeLlm,
  resolveLlmTarget,
  type LlmProvider,
} from '../lib/llm-client';
import {
  PROMPT_VERSIONS,
  TASK_PRIORITY_PREDICTION_SYSTEM_PROMPT,
  buildTaskPriorityPrompt,
  type ChatContextParams,
} from '../lib/prompt-templates';
import {
  AiServiceError,
  executeAiChatTurn,
  resolveServerAiIdentityContext,
} from '../lib/ai-chat-service';
import type {
  TaskPriorityPredictionInput,
  TaskPriorityPredictionResult,
} from '../types/ai.types';
import {
  parsePredictionOutput,
  generateFallbackPrediction,
} from '../lib/task-prioritizing';

export interface SendAiChatMessageInput {
  prompt: string;
  context?: ChatContextParams;
  teamId?: string;
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
 * Uses unified server-derived identity context, cache-first lookup, and owner isolation (Issue #43 / #149).
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

    const result = await executeAiChatTurn({
      supabase,
      user,
      prompt: input.prompt,
      clientContext: input.context,
      requestedTeamId: input.teamId,
      provider: input.provider,
    });

    return {
      success: true,
      data: {
        reply: result.reply,
        isCached: result.isCached,
        provider: result.provider,
        model: result.model,
        ...(result.cachedAt ? { cachedAt: result.cachedAt } : {}),
      },
    };
  } catch (error) {
    if (error instanceof AiServiceError) {
      return {
        success: false,
        error:
          error.status === 400
            ? { prompt: [error.message] }
            : { _form: [error.message] },
      };
    }

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

export { generateFallbackPrediction };

/**
 * Server action to predict task priority and duration from title & description (Issue #45 / #149).
 * Enforces owner/team/model/prompt-version isolated caching in PostgreSQL.
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

    const serverIdentity = await resolveServerAiIdentityContext(supabase, user);
    const llmTarget = resolveLlmTarget();
    const promptVersion = PROMPT_VERSIONS.taskPriority;
    const scopeTeamKey = serverIdentity.effectiveTeamId ?? 'no-team';
    const contextDigest = computeTextDigest(
      JSON.stringify({
        promptVersion,
        systemPrompt: TASK_PRIORITY_PREDICTION_SYSTEM_PROMPT,
        teamId: scopeTeamKey,
        role: serverIdentity.context.userRole,
      })
    );

    // 1. Check owner-isolated PostgreSQL query cache
    const queryHash = generateQueryHash(promptText, {
      userId: user.id,
      teamId: scopeTeamKey,
      scope: 'priority-pred',
      provider: llmTarget.provider,
      model: llmTarget.model,
      promptVersion,
      contextDigest,
    });

    const cached = await getCachedAiResponse({
      userId: user.id,
      queryHash,
    });

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
      provider: llmTarget.provider,
      model: llmTarget.isSimulation ? undefined : llmTarget.model,
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

    // 4. Save result in owner-isolated PostgreSQL cache
    await saveCachedAiResponse({
      userId: user.id,
      teamId: serverIdentity.effectiveTeamId,
      cacheScope: `priority-pred:${scopeTeamKey}`,
      provider: llmResult.provider,
      model: llmResult.model,
      promptVersion,
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
