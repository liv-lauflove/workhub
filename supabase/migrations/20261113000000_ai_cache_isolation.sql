-- =====================================================================
-- Migration: Isolate Private AI Query Cache & Enforce Ownership/TTL
-- Issue #149: fix(ai): isolasi cache privat dan pertahankan makna input pada cache key
-- Audit Reference: S05, B06 (High Priority)
-- =====================================================================

-- 1. Purge legacy shared/unowned cache rows so historical private prompts
--    and cross-user responses cannot remain accessible via Data API.
delete from public.ai_query_cache;

-- 2. Add explicit ownership, scope, model, and prompt-version columns
alter table public.ai_query_cache
  add column if not exists user_id uuid not null references public.profiles(id) on delete cascade,
  add column if not exists team_id uuid references public.teams(id) on delete cascade,
  add column if not exists cache_scope text not null default 'eng-manager',
  add column if not exists provider text not null default 'gemini',
  add column if not exists model text not null default '',
  add column if not exists prompt_version text not null default 'v1';

-- Enforce bounded non-null TTL and retention ceiling (max 7 days per entry)
alter table public.ai_query_cache
  alter column expires_at set default (now() + interval '24 hours'),
  alter column expires_at set not null;

alter table public.ai_query_cache
  drop constraint if exists chk_ai_query_cache_ttl_bounded;

alter table public.ai_query_cache
  add constraint chk_ai_query_cache_ttl_bounded
  check (expires_at <= created_at + interval '7 days');

-- 3. Indexes for per-user lookup and expired cache sweep
create index if not exists idx_ai_query_cache_user_expires
  on public.ai_query_cache (user_id, expires_at);

create index if not exists idx_ai_query_cache_expires_at
  on public.ai_query_cache (expires_at);

-- 4. Lock down table privileges (read-only for authenticated, server-only writes)
revoke all on table public.ai_query_cache from public, anon, authenticated;
grant select on table public.ai_query_cache to authenticated;
grant all privileges on table public.ai_query_cache to service_role;

-- 5. Replace permissive RLS SELECT policy with strict owner + expiry isolation
alter table public.ai_query_cache enable row level security;

drop policy if exists "ai_query_cache_select_authenticated" on public.ai_query_cache;
drop policy if exists "ai_query_cache_select_own" on public.ai_query_cache;

create policy "ai_query_cache_select_own"
  on public.ai_query_cache for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and expires_at > now()
  );

notify pgrst, 'reload schema';
