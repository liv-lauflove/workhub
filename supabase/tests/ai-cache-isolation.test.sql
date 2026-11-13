-- =====================================================================
-- Test Suite: AI Query Cache Isolation, Privileges, RLS & Retention
-- Issue #149: fix(ai): isolasi cache privat dan pertahankan makna input pada cache key
-- Audit Reference: S05, B06
-- =====================================================================

begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

create schema if not exists issue149_test;

create or replace function issue149_test.check_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

create or replace function issue149_test.expect_error(
  statement text,
  expected_state text,
  message text
)
returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_state then
      return;
    end if;
    raise;
  end;
  raise exception 'Expected SQLSTATE % for: %', expected_state, message;
end;
$$;

grant usage on schema issue149_test to authenticated, anon, service_role;
grant execute on all functions in schema issue149_test to authenticated, anon, service_role;

-- =====================================================================
-- 1. TABLE & PRIVILEGE CHECKS
-- =====================================================================
select issue149_test.check_true(
  not has_table_privilege('anon', 'public.ai_query_cache', 'SELECT')
  and not has_table_privilege('anon', 'public.ai_query_cache', 'INSERT'),
  'Anon role must NOT have any privileges on public.ai_query_cache'
);

select issue149_test.check_true(
  has_table_privilege('authenticated', 'public.ai_query_cache', 'SELECT')
  and not has_table_privilege('authenticated', 'public.ai_query_cache', 'INSERT')
  and not has_table_privilege('authenticated', 'public.ai_query_cache', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.ai_query_cache', 'DELETE'),
  'Authenticated role must have SELECT only on public.ai_query_cache (no direct writes)'
);

select issue149_test.check_true(
  has_table_privilege('service_role', 'public.ai_query_cache', 'SELECT')
  and has_table_privilege('service_role', 'public.ai_query_cache', 'INSERT')
  and has_table_privilege('service_role', 'public.ai_query_cache', 'UPDATE')
  and has_table_privilege('service_role', 'public.ai_query_cache', 'DELETE'),
  'Service role must have full privileges on public.ai_query_cache'
);

-- =====================================================================
-- 2. SYNTHETIC FIXTURE SETUP
-- =====================================================================
insert into public.teams (id, name) values
  ('b1490000-0000-4000-8000-000000000001', 'Issue 149 Team Alpha'),
  ('b1490000-0000-4000-8000-000000000002', 'Issue 149 Team Beta'),
  ('e3333333-3333-3333-3333-333333333333', 'Management')
on conflict (id) do nothing;

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
  ('a1490000-0000-4000-8000-000000000001', 'alice149@workhub.invalid', '{"full_name":"Alice Alpha"}', now()),
  ('a1490000-0000-4000-8000-000000000002', 'bob149@workhub.invalid', '{"full_name":"Bob Beta"}', now()),
  ('a1490000-0000-4000-8000-000000000003', 'mgmt149@workhub.invalid', '{"full_name":"Mgmt Leader"}', now())
on conflict (id) do nothing;

update public.profiles
set team_id = 'b1490000-0000-4000-8000-000000000001', role = 'member'
where id = 'a1490000-0000-4000-8000-000000000001';

update public.profiles
set team_id = 'b1490000-0000-4000-8000-000000000002', role = 'leader'
where id = 'a1490000-0000-4000-8000-000000000002';

update public.profiles
set team_id = 'e3333333-3333-3333-3333-333333333333', role = 'leader'
where id = 'a1490000-0000-4000-8000-000000000003';

-- Constraint enforcement tests (before adding valid rows)
-- A. Null user_id must fail (23502)
select issue149_test.expect_error(
  $$insert into public.ai_query_cache (query_hash, query_text, response_text)
    values ('hash-null-user', 'secret', 'resp')$$,
  '23502',
  'Unowned cache entry without user_id must be rejected'
);

-- B. TTL longer than 7 days retention ceiling must fail (23514)
select issue149_test.expect_error(
  $$insert into public.ai_query_cache (
      user_id, team_id, cache_scope, provider, model, prompt_version,
      query_hash, query_text, response_text, expires_at
    ) values (
      'a1490000-0000-4000-8000-000000000001',
      'b1490000-0000-4000-8000-000000000001',
      'eng-manager', 'gemini', 'gemini-flash-lite-latest', 'v2',
      'hash-too-long-ttl', 'secret', 'resp', now() + interval '14 days'
    )$$,
  '23514',
  'Cache entry exceeding 7-day retention ceiling must be rejected'
);

-- Insert active and expired synthetic cache rows for Alice & Bob (as service_role/postgres)
insert into public.ai_query_cache (
  id, user_id, team_id, cache_scope, provider, model, prompt_version,
  query_hash, query_text, response_text, created_at, expires_at
) values
  -- Alice active entry
  ('c1490000-0000-4000-8000-000000000001',
   'a1490000-0000-4000-8000-000000000001',
   'b1490000-0000-4000-8000-000000000001',
   'eng-manager', 'gemini', 'gemini-flash-lite-latest', 'eng-manager-v2',
   'hash-alice-active-149',
   'Apa status rahasia sprint Alpha?',
   'Respons pribadi untuk Alice Alpha',
   now(),
   now() + interval '1 hour'),

  -- Alice expired entry
  ('c1490000-0000-4000-8000-000000000002',
   'a1490000-0000-4000-8000-000000000001',
   'b1490000-0000-4000-8000-000000000001',
   'eng-manager', 'gemini', 'gemini-flash-lite-latest', 'eng-manager-v2',
   'hash-alice-expired-149',
   'Prompt lama Alice yang sudah kadaluarsa',
   'Respons lama Alice',
   now() - interval '2 days',
   now() - interval '1 hour'),

  -- Bob active entry
  ('c1490000-0000-4000-8000-000000000003',
   'a1490000-0000-4000-8000-000000000002',
   'b1490000-0000-4000-8000-000000000002',
   'eng-manager', 'openai', 'gpt-4o-mini', 'eng-manager-v2',
   'hash-bob-active-149',
   'Prompt pribadi Bob Beta',
   'Respons pribadi untuk Bob Beta',
   now(),
   now() + interval '1 hour');

-- =====================================================================
-- 3. RLS DATA API ISOLATION CHECKS
-- =====================================================================
set local role authenticated;

-- Impersonate Alice
select set_config('request.jwt.claim.sub', 'a1490000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

select issue149_test.check_true(
  (select count(*) from public.ai_query_cache
   where id = 'c1490000-0000-4000-8000-000000000001') = 1,
  'Alice must see her own active cache entry'
);

select issue149_test.check_true(
  (select count(*) from public.ai_query_cache
   where id = 'c1490000-0000-4000-8000-000000000002') = 0,
  'Alice must NOT see expired cache entries via Data API'
);

select issue149_test.check_true(
  (select count(*) from public.ai_query_cache
   where id = 'c1490000-0000-4000-8000-000000000003') = 0,
  'Alice must NOT see Bob private cache entries via Data API'
);

-- Client direct mutation must be rejected (42501)
select issue149_test.expect_error(
  $$insert into public.ai_query_cache (user_id, query_hash, query_text, response_text)
    values ('a1490000-0000-4000-8000-000000000001', 'forged', 'p', 'r')$$,
  '42501',
  'Authenticated client must NOT insert directly into ai_query_cache'
);

select issue149_test.expect_error(
  $$update public.ai_query_cache set response_text = 'tampered'
    where id = 'c1490000-0000-4000-8000-000000000001'$$,
  '42501',
  'Authenticated client must NOT update ai_query_cache'
);

select issue149_test.expect_error(
  $$delete from public.ai_query_cache
    where id = 'c1490000-0000-4000-8000-000000000001'$$,
  '42501',
  'Authenticated client must NOT delete ai_query_cache'
);

-- Impersonate Bob (leader of Team Beta)
select set_config('request.jwt.claim.sub', 'a1490000-0000-4000-8000-000000000002', true);

select issue149_test.check_true(
  (select count(*) from public.ai_query_cache
   where id = 'c1490000-0000-4000-8000-000000000001') = 0,
  'Bob (Team Beta leader) must NOT see Alice private cache'
);

select issue149_test.check_true(
  (select count(*) from public.ai_query_cache
   where id = 'c1490000-0000-4000-8000-000000000003') = 1,
  'Bob must see his own active cache entry'
);

-- Impersonate Management leader
select set_config('request.jwt.claim.sub', 'a1490000-0000-4000-8000-000000000003', true);

select issue149_test.check_true(
  (select count(*) from public.ai_query_cache
   where id in ('c1490000-0000-4000-8000-000000000001', 'c1490000-0000-4000-8000-000000000003')) = 0,
  'Management user must NOT bypass per-user privacy isolation on ai_query_cache via Data API'
);

-- Check cascade deletion on profile removal (as admin/postgres)
reset role;
delete from auth.users where id = 'a1490000-0000-4000-8000-000000000001';

select issue149_test.check_true(
  (select count(*) from public.ai_query_cache
   where id in ('c1490000-0000-4000-8000-000000000001', 'c1490000-0000-4000-8000-000000000002')) = 0,
  'Deleting user must cascade delete their private AI cache rows'
);

rollback;
