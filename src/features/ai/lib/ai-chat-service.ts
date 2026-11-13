import 'server-only';
import type { createClient } from '@/lib/supabase/server';
import { MANAGEMENT_TEAM_ID } from '@/features/team/constants';
import {
  DEFAULT_SYSTEM_PROMPT,
  PROMPT_VERSIONS,
  buildSystemPromptWithContext,
  type ChatContextParams,
} from './prompt-templates';
import {
  invokeLlm,
  resolveLlmTarget,
  type InvokeLlmResult,
  type LlmProvider,
} from './llm-client';
import {
  classifyRagIntent,
  buildRagPromptHeader,
  type RagQueryCategory,
} from '../rag/knowledge-extractor';
import { getSanitizedTeamWorkloadContext } from '../rag/workload-aggregator';
import {
  computeTextDigest,
  generateQueryHash,
  getCachedAiResponse,
  saveCachedAiResponse,
} from '../queries/ai-cache.queries';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export class AiServiceError extends Error {
  status: number;

  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'AiServiceError';
    this.status = status;
  }
}

export interface ServerAiIdentityContext {
  userId: string;
  userTeamId: string | null;
  effectiveTeamId: string | null;
  isManagement: boolean;
  context: ChatContextParams;
}

export interface ExecuteAiChatTurnParams {
  supabase: SupabaseServerClient;
  user: { id: string; email?: string | null };
  prompt: string;
  clientContext?: ChatContextParams;
  requestedTeamId?: string;
  provider?: LlmProvider;
  model?: string;
}

export interface ExecuteAiChatTurnResult {
  reply: string;
  isCached: boolean;
  provider: string;
  model: string;
  category: RagQueryCategory;
  queryHash: string;
  cachedAt?: string;
  usage?: InvokeLlmResult['usage'];
}

/**
 * Derives authoritative user role, display name, and team scope strictly from
 * database profile records on the server, ignoring spoofable client identity fields.
 */
export async function resolveServerAiIdentityContext(
  supabase: SupabaseServerClient,
  user: { id: string; email?: string | null },
  options?: {
    requestedTeamId?: string;
    clientContext?: ChatContextParams;
  }
): Promise<ServerAiIdentityContext> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, team_id')
    .eq('id', user.id)
    .maybeSingle();

  const userTeamId = profile?.team_id || null;
  const isManagement = userTeamId === MANAGEMENT_TEAM_ID;
  const requestedTeamId = options?.requestedTeamId?.trim() || undefined;

  if (requestedTeamId && !isManagement && requestedTeamId !== userTeamId) {
    throw new AiServiceError(
      'Forbidden: Anda tidak memiliki akses ke cakupan tim tersebut.',
      403
    );
  }

  const effectiveTeamId = requestedTeamId || userTeamId;

  let teamName: string | undefined;
  if (effectiveTeamId === 'all') {
    teamName = 'Semua Tim (BSA Tech)';
  } else if (effectiveTeamId) {
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', effectiveTeamId)
      .maybeSingle();
    teamName = team?.name || undefined;
  }

  const sanitizedQuarter = options?.clientContext?.currentQuarter
    ?.trim()
    .slice(0, 32);

  return {
    userId: user.id,
    userTeamId,
    effectiveTeamId,
    isManagement,
    context: {
      userName:
        profile?.full_name || user.email?.split('@')[0] || 'Pengguna Workhub',
      userRole: profile?.role || 'member',
      teamName,
      currentQuarter: sanitizedQuarter || undefined,
    },
  };
}

/**
 * Unified AI chat orchestration used across all chat routes and Server Actions.
 * Guarantees uniform prompt validation, server-derived identity context,
 * isolated cache lookup/persistence, and real-time workload cache bypass.
 */
export async function executeAiChatTurn(
  params: ExecuteAiChatTurnParams
): Promise<ExecuteAiChatTurnResult> {
  const trimmedPrompt = params.prompt?.trim();
  if (!trimmedPrompt) {
    throw new AiServiceError('Prompt pertanyaan tidak boleh kosong.', 400);
  }

  if (trimmedPrompt.length > 4000) {
    throw new AiServiceError(
      'Prompt melebihi batas maksimum 4000 karakter.',
      400
    );
  }

  // 1. Resolve authoritative user identity and authorized team scope on the server
  const serverIdentity = await resolveServerAiIdentityContext(
    params.supabase,
    params.user,
    {
      requestedTeamId: params.requestedTeamId,
      clientContext: params.clientContext,
    }
  );

  // 2. Classify RAG intent and build knowledge & prompt context
  const { category, requiresWorkload } = classifyRagIntent(trimmedPrompt);
  const ragKnowledgeHeader = buildRagPromptHeader(trimmedPrompt);
  const basePromptWithContext = buildSystemPromptWithContext(
    DEFAULT_SYSTEM_PROMPT,
    serverIdentity.context
  );

  // 3. Resolve effective LLM target & build isolated query hash before cache lookup
  const llmTarget = resolveLlmTarget({
    provider: params.provider,
    model: params.model,
  });

  const promptVersion = PROMPT_VERSIONS.engineeringManager;
  const scopeTeamKey = serverIdentity.effectiveTeamId ?? 'no-team';
  const contextDigest = computeTextDigest(
    JSON.stringify({
      promptVersion,
      effectiveTeamId: scopeTeamKey,
      category,
      basePromptWithContext,
      ragKnowledgeHeader,
    })
  );

  const queryHash = generateQueryHash(trimmedPrompt, {
    userId: serverIdentity.userId,
    teamId: scopeTeamKey,
    scope: 'eng-manager',
    provider: llmTarget.provider,
    model: llmTarget.model,
    promptVersion,
    contextDigest,
  });

  // 4. Lookup owner-isolated cache only for non-real-time queries
  if (!requiresWorkload) {
    const cached = await getCachedAiResponse({
      userId: serverIdentity.userId,
      queryHash,
    });

    if (cached) {
      return {
        reply: cached.responseText,
        isCached: true,
        provider: 'cache',
        model: 'postgres-ai-query-cache',
        category,
        queryHash: cached.queryHash,
        cachedAt: cached.createdAt,
      };
    }
  }

  // 5. Fetch live sanitized workload context when required
  let workloadBlock = '';
  if (requiresWorkload || category === 'workload') {
    const workloadSummary = await getSanitizedTeamWorkloadContext(
      serverIdentity.effectiveTeamId || undefined
    );
    if (workloadSummary?.formattedContextString) {
      workloadBlock = `\n\n${workloadSummary.formattedContextString}`;
    }
  }

  const compositeSystemPrompt = `${basePromptWithContext}${ragKnowledgeHeader}${workloadBlock}`;

  // 6. Invoke LLM
  const llmResult = await invokeLlm({
    prompt: trimmedPrompt,
    systemPrompt: compositeSystemPrompt,
    provider: llmTarget.provider,
    model: llmTarget.isSimulation ? undefined : llmTarget.model,
  });

  // 7. Persist cache entry isolated by user, team, model, prompt version, and context
  if (!requiresWorkload) {
    await saveCachedAiResponse({
      userId: serverIdentity.userId,
      teamId: serverIdentity.effectiveTeamId,
      cacheScope: `eng-manager:${scopeTeamKey}`,
      provider: llmResult.provider,
      model: llmResult.model,
      promptVersion,
      queryHash,
      queryText: trimmedPrompt,
      responseText: llmResult.text,
    });
  }

  return {
    reply: llmResult.text,
    isCached: false,
    provider: llmResult.provider,
    model: llmResult.model,
    category,
    queryHash,
    usage: llmResult.usage,
  };
}
