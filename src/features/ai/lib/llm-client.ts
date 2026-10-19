import 'server-only';
import { DEFAULT_SYSTEM_PROMPT } from './prompt-templates';

export type LlmProvider = 'gemini' | 'openai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface InvokeLlmOptions {
  /**
   * Main text prompt from the user (can be used alongside or in place of `messages`).
   */
  prompt?: string;
  /**
   * Conversation history if multi-turn chat is needed.
   */
  messages?: ChatMessage[];
  /**
   * System instruction defining persona and constraints.
   */
  systemPrompt?: string;
  /**
   * Explicitly choose provider ('gemini' | 'openai'). Defaults to AI_PROVIDER env or auto-detected.
   */
  provider?: LlmProvider;
  /**
   * Model identifier override (e.g. 'gemini-1.5-flash', 'gpt-4o-mini').
   */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /**
   * Request timeout in milliseconds (default: 60000ms).
   */
  timeoutMs?: number;
}

export interface InvokeLlmResult {
  text: string;
  provider: LlmProvider;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Resolves which provider and API key to use based on configuration and availability.
 */
function resolveProvider(requestedProvider?: LlmProvider): {
  provider: LlmProvider;
  apiKey: string;
} {
  const envProvider =
    (process.env.AI_PROVIDER?.toLowerCase() as LlmProvider) || 'gemini';
  const targetProvider = requestedProvider || envProvider;

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (targetProvider === 'openai') {
    if (openaiKey && !openaiKey.includes('your-openai')) {
      return { provider: 'openai', apiKey: openaiKey };
    }
    if (geminiKey && !geminiKey.includes('your-gemini')) {
      return { provider: 'gemini', apiKey: geminiKey };
    }
  } else {
    if (geminiKey && !geminiKey.includes('your-gemini')) {
      return { provider: 'gemini', apiKey: geminiKey };
    }
    if (openaiKey && !openaiKey.includes('your-openai')) {
      return { provider: 'openai', apiKey: openaiKey };
    }
  }

  // No active API key found
  return { provider: targetProvider, apiKey: '' };
}

/**
 * Calls Google Gemini REST API (v1beta).
 */
async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens?: number,
  signal?: AbortSignal
): Promise<InvokeLlmResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${apiKey}`;

  // Format messages into Gemini contents structure
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature,
      ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
    },
  };

  if (systemPrompt) {
    payload.system_instruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Gemini API error (${response.status} ${response.statusText}): ${errorBody}`
    );
  }

  const json = await response.json();
  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text ?? '';

  return {
    text: text.trim(),
    provider: 'gemini',
    model,
    usage: {
      promptTokens: json.usageMetadata?.promptTokenCount,
      completionTokens: json.usageMetadata?.candidatesTokenCount,
      totalTokens: json.usageMetadata?.totalTokenCount,
    },
  };
}

/**
 * Calls OpenAI Chat Completions REST API.
 */
async function callOpenAi(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens?: number,
  signal?: AbortSignal
): Promise<InvokeLlmResult> {
  const url = 'https://api.openai.com/v1/chat/completions';

  const formattedMessages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const payload = {
    model,
    messages: formattedMessages,
    temperature,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `OpenAI API error (${response.status} ${response.statusText}): ${errorBody}`
    );
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content ?? '';

  return {
    text: text.trim(),
    provider: 'openai',
    model,
    usage: {
      promptTokens: json.usage?.prompt_tokens,
      completionTokens: json.usage?.completion_tokens,
      totalTokens: json.usage?.total_tokens,
    },
  };
}

/**
 * Invokes LLM provider (Gemini or OpenAI) with system prompt, chat history,
 * timeout controls, and simulated fallback for local development.
 */
export async function invokeLlm(
  options: InvokeLlmOptions = {}
): Promise<InvokeLlmResult> {
  const {
    prompt,
    messages = [],
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    requestedProvider,
    temperature = 0.7,
    maxTokens = 2048,
    timeoutMs = options.timeoutMs ??
      (Number(process.env.AI_TIMEOUT_MS) || 60000),
  } = {
    ...options,
    requestedProvider: options.provider,
  };

  // Build message sequence
  const chatMessages: ChatMessage[] = [...messages];
  if (
    prompt &&
    (!chatMessages.length ||
      chatMessages[chatMessages.length - 1].content !== prompt)
  ) {
    chatMessages.push({ role: 'user', content: prompt });
  }

  if (chatMessages.length === 0) {
    throw new Error('No user prompt or message provided to invokeLlm.');
  }

  const { provider, apiKey } = resolveProvider(requestedProvider);
  const userQuery = chatMessages[chatMessages.length - 1].content;

  // Graceful development mode mock when API key is not configured yet
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      return {
        text: `[Workhub AI Simulation]\n\nSebagai Engineering Manager & Data Analyst di Workhub, saya telah menerima pertanyaan Anda:\n> "${userQuery}"\n\n*(Catatan: Kunci API \`GEMINI_API_KEY\` atau \`OPENAI_API_KEY\` belum dikonfigurasi di file environment lokal. Silakan tambahkan API key ke \`.env.local\` untuk mengaktifkan respons LLM sesungguhnya).*`,
        provider,
        model: 'simulation-mode',
      };
    }
    throw new Error(
      `LLM Provider '${provider}' is selected but no valid API key was found in environment variables.`
    );
  }

  const signal = AbortSignal.timeout(timeoutMs);

  if (provider === 'openai') {
    const model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    return await callOpenAi(
      apiKey,
      model,
      systemPrompt,
      chatMessages,
      temperature,
      maxTokens,
      signal
    );
  }

  // Default: Gemini
  const model =
    options.model || process.env.GEMINI_MODEL || 'gemini-flash-latest';
  return await callGemini(
    apiKey,
    model,
    systemPrompt,
    chatMessages,
    temperature,
    maxTokens,
    signal
  );
}
