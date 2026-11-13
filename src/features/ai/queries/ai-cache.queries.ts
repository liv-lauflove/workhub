import 'server-only';
import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CACHE_KEY_VERSION = 'v2';
const MIN_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 86400; // 24 hours max retention per active entry
const DEFAULT_TTL_SECONDS = Math.min(
  Math.max(
    Number(process.env.AI_CACHE_TTL_SECONDS) || MAX_TTL_SECONDS,
    MIN_TTL_SECONDS
  ),
  MAX_TTL_SECONDS
);
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CachedAiResponse {
  id: string;
  userId: string;
  teamId: string | null;
  cacheScope: string;
  provider: string;
  model: string;
  promptVersion: string;
  queryHash: string;
  queryText: string;
  responseText: string;
  createdAt: string;
  expiresAt: string;
  isCached: true;
}

export interface GenerateQueryHashOptions {
  userId?: string | null;
  teamId?: string | null;
  scope?: string;
  provider?: string;
  model?: string;
  promptVersion?: string;
  contextDigest?: string;
}

export interface GetCachedAiResponseParams {
  userId: string;
  queryHash: string;
}

export interface SaveCachedAiResponseParams {
  userId: string;
  teamId?: string | null;
  cacheScope: string;
  provider: string;
  model: string;
  promptVersion: string;
  queryHash: string;
  queryText: string;
  responseText: string;
  ttlSeconds?: number;
}

/**
 * Normalizes user prompt text while preserving semantic operators and punctuation:
 * - Normalizes Unicode compatibility composition (NFKC)
 * - Trims outer whitespace
 * - Collapses repeated internal whitespace into single spaces
 * - Converts to lowercase without stripping arithmetic operators, symbols, or punctuation
 */
export function normalizeQueryText(query: string): string {
  return query.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Produces a deterministic SHA-256 hex digest for structured prompt or context text.
 */
export function computeTextDigest(text: string): string {
  return createHash('sha256').update(text.normalize('NFKC')).digest('hex');
}

/**
 * Computes an isolated SHA-256 cache key combining normalized prompt, owner identity,
 * team scope, AI provider/model, prompt version, and effective system context digest.
 */
export function generateQueryHash(
  query: string,
  scopeOrOptions: string | GenerateQueryHashOptions = {}
): string {
  const options: GenerateQueryHashOptions =
    typeof scopeOrOptions === 'string'
      ? { scope: scopeOrOptions }
      : scopeOrOptions;

  const normalized = normalizeQueryText(query);
  const canonicalPayload = JSON.stringify([
    CACHE_KEY_VERSION,
    options.userId ?? '',
    options.teamId ?? '',
    options.scope ?? 'eng-manager',
    options.provider ?? 'default',
    options.model ?? 'default',
    options.promptVersion ?? 'v1',
    options.contextDigest ?? '',
    normalized,
  ]);

  return createHash('sha256').update(canonicalPayload).digest('hex');
}

/**
 * Retrieves an active, owner-isolated cached AI response for the authenticated user.
 * Enforces explicit user ownership and TTL checks in addition to PostgreSQL RLS.
 */
export async function getCachedAiResponse(
  params: GetCachedAiResponseParams
): Promise<CachedAiResponse | null> {
  try {
    if (
      !params ||
      typeof params !== 'object' ||
      !params.userId?.trim() ||
      !params.queryHash?.trim()
    ) {
      return null;
    }

    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('ai_query_cache')
      .select(
        'id, user_id, team_id, cache_scope, provider, model, prompt_version, query_hash, query_text, response_text, created_at, expires_at'
      )
      .eq('query_hash', params.queryHash)
      .eq('user_id', params.userId)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Defense-in-depth verification against permissive or misconfigured query adapters
    if (data.user_id !== params.userId) {
      return null;
    }

    if (!data.expires_at || data.expires_at <= nowIso) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      teamId: data.team_id,
      cacheScope: data.cache_scope,
      provider: data.provider,
      model: data.model,
      promptVersion: data.prompt_version,
      queryHash: data.query_hash,
      queryText: data.query_text,
      responseText: data.response_text,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      isCached: true,
    };
  } catch (err) {
    console.error('Failed to retrieve AI cache:', err);
    return null;
  }
}

/**
 * Persists an owner-isolated AI response in PostgreSQL cache with bounded TTL.
 * Uses elevated admin client (service_role) because authenticated clients are read-only.
 */
export async function saveCachedAiResponse(
  params: SaveCachedAiResponseParams
): Promise<boolean> {
  try {
    if (!params.userId?.trim() || !params.queryHash?.trim()) {
      return false;
    }

    const admin = createAdminClient();
    const rawTtl = params.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const ttl = Math.min(
      Math.max(
        Number.isFinite(rawTtl) ? rawTtl : DEFAULT_TTL_SECONDS,
        MIN_TTL_SECONDS
      ),
      MAX_TTL_SECONDS
    );

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const expiresAt = new Date(nowMs + ttl * 1000).toISOString();
    const sanitizedTeamId =
      params.teamId && UUID_REGEX.test(params.teamId) ? params.teamId : null;

    // Opportunistically clean expired records for this user to keep prompt retention bounded
    try {
      await admin
        .from('ai_query_cache')
        .delete()
        .eq('user_id', params.userId)
        .lt('expires_at', nowIso);
    } catch {
      // Non-fatal cleanup failure must not block persisting fresh response
    }

    const { error } = await admin.from('ai_query_cache').upsert(
      {
        user_id: params.userId,
        team_id: sanitizedTeamId,
        cache_scope: params.cacheScope,
        provider: params.provider,
        model: params.model,
        prompt_version: params.promptVersion,
        query_hash: params.queryHash,
        query_text: params.queryText,
        response_text: params.responseText,
        created_at: nowIso,
        expires_at: expiresAt,
      },
      { onConflict: 'query_hash' }
    );

    if (error) {
      console.error('Error inserting into ai_query_cache:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to save AI query cache:', err);
    return false;
  }
}

/**
 * Purges expired cache records to keep retention bounded and database clean.
 */
export async function purgeExpiredAiCache(userId?: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();

    let query = admin
      .from('ai_query_cache')
      .delete({ count: 'exact' })
      .lt('expires_at', nowIso);

    if (userId?.trim()) {
      query = query.eq('user_id', userId.trim());
    }

    const { error, count } = await query;

    if (error) {
      console.error('Error purging expired AI cache:', error.message);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error('Failed to purge expired AI cache:', err);
    return 0;
  }
}
