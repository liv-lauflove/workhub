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
  type ChatContextParams,
} from '../lib/prompt-templates';

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

    // Step 1: Check PostgreSQL query cache first (SHA-256 hash)
    const queryHash = generateQueryHash(trimmedPrompt, 'eng-manager');
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

    // Step 2: Cache miss — Build system prompt with workspace context
    const systemPrompt = buildSystemPromptWithContext(
      DEFAULT_SYSTEM_PROMPT,
      input.context
    );

    // Step 3: Invoke LLM provider
    const llmResult = await invokeLlm({
      prompt: trimmedPrompt,
      systemPrompt,
      provider: input.provider,
    });

    // Step 4: Persist successful response in PostgreSQL cache
    await saveCachedAiResponse({
      queryHash,
      queryText: trimmedPrompt,
      responseText: llmResult.text,
    });

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

/**
 * Backward compatibility placeholder.
 */
export async function placeholderAiAction() {
  return null;
}
