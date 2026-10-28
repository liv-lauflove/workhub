import 'server-only';
import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const DEFAULT_TTL_SECONDS = Number(process.env.AI_CACHE_TTL_SECONDS) || 86400; // 24 hours

export interface CachedAiResponse {
  id: string;
  queryHash: string;
  queryText: string;
  responseText: string;
  createdAt: string;
  expiresAt: string | null;
  isCached: true;
}

/**
 * Normalizes user prompt text for semantic uniformity:
 * - Trims whitespace
 * - Converts to lowercase
 * - Strips superfluous punctuation
 * - Collapses repeated whitespace
 */
export function normalizeQueryText(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ');
}

/**
 * Computes a SHA-256 hash of a normalized query and optional scope/persona.
 */
export function generateQueryHash(
  query: string,
  scope: string = 'eng-manager'
): string {
  const normalized = normalizeQueryText(query);
  return createHash('sha256').update(`${scope}:${normalized}`).digest('hex');
}

/**
 * Retrieves a cached AI response from PostgreSQL by query hash.
 * Returns null if not found or if the cache entry has expired.
 */
export async function getCachedAiResponse(
  queryHash: string
): Promise<CachedAiResponse | null> {
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('ai_query_cache')
      .select(
        'id, query_hash, query_text, response_text, created_at, expires_at'
      )
      .eq('query_hash', queryHash)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Check expiration if expires_at is set
    if (data.expires_at && data.expires_at < nowIso) {
      return null;
    }

    return {
      id: data.id,
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
 * Saves or refreshes an AI response in PostgreSQL cache.
 * Uses elevated admin client (service_role) to comply with RLS security policies.
 */
export async function saveCachedAiResponse(params: {
  queryHash: string;
  queryText: string;
  responseText: string;
  ttlSeconds?: number;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const ttl = params.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const { error } = await admin.from('ai_query_cache').upsert(
      {
        query_hash: params.queryHash,
        query_text: params.queryText,
        response_text: params.responseText,
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
 * Purges expired cache records to keep database clean.
 */
export async function purgeExpiredAiCache(): Promise<number> {
  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();

    const { error, count } = await admin
      .from('ai_query_cache')
      .delete({ count: 'exact' })
      .lt('expires_at', nowIso);

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
