-- =====================================================================
-- Test Suite: Atomic Team Invitation Claim & Email Verification
-- Issue #148: fix(auth): klaim undangan setelah verifikasi email secara atomik
-- Audit Reference: S04, B04
-- =====================================================================

begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

create schema if not exists issue148_test;

create or replace function issue148_test.check_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

create or replace function issue148_test.expect_error(
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

grant usage on schema issue148_test to authenticated, anon, service_role;
grant execute on all functions in schema issue148_test to authenticated, anon, service_role;

-- =====================================================================
-- PERMISSION CHECKS
-- =====================================================================
select issue148_test.check_true(
  not has_function_privilege('anon', 'public.claim_team_invitation(uuid,text)', 'EXECUTE'),
  'Anonymous role must NOT have execute privilege on claim_team_invitation'
);

select issue148_test.check_true(
  has_function_privilege('authenticated', 'public.claim_team_invitation(uuid,text)', 'EXECUTE'),
  'Authenticated role must have execute privilege on claim_team_invitation'
);

select issue148_test.check_true(
  has_function_privilege('service_role', 'public.claim_team_invitation(uuid,text)', 'EXECUTE'),
  'Service role must have execute privilege on claim_team_invitation'
);

-- =====================================================================
-- FIXTURE SETUP
-- =====================================================================
-- 1. Synthetic Teams
insert into public.teams (id, name) values
  ('b1480000-0000-4000-8000-000000000001', 'Issue 148 Test Team Alpha'),
  ('b1480000-0000-4000-8000-000000000002', 'Issue 148 Test Team Beta')
on conflict (id) do nothing;

-- 2. Synthetic Inviter User (Team Alpha Leader)
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values (
  'a1480000-0000-4000-8000-000000000099',
  'inviter148@workhub.invalid',
  jsonb_build_object('full_name', 'Inviter Leader'),
  now()
) on conflict (id) do nothing;

update public.profiles
set team_id = 'b1480000-0000-4000-8000-000000000001', role = 'leader'
where id = 'a1480000-0000-4000-8000-000000000099';

-- 3. Synthetic Invitations
insert into public.team_invitations (
  id, team_id, email, role, invited_by, token, status, expires_at
) values
  -- Valid pending invitation for unconfirmed signup test
  ('c1480000-0000-4000-8000-000000000001', 'b1480000-0000-4000-8000-000000000001',
   'unconfirmed148@workhub.invalid', 'leader', 'a1480000-0000-4000-8000-000000000099',
   'tok-148-unconfirmed', 'pending', now() + interval '7 days'),

  -- Valid pending invitation for confirmed signup (OAuth) test
  ('c1480000-0000-4000-8000-000000000002', 'b1480000-0000-4000-8000-000000000001',
   'confirmed148@workhub.invalid', 'leader', 'a1480000-0000-4000-8000-000000000099',
   'tok-148-confirmed', 'pending', now() + interval '7 days'),

  -- Valid pending invitation for delayed email confirmation update test
  ('c1480000-0000-4000-8000-000000000003', 'b1480000-0000-4000-8000-000000000001',
   'delayed148@workhub.invalid', 'leader', 'a1480000-0000-4000-8000-000000000099',
   'tok-148-delayed', 'pending', now() + interval '7 days'),

  -- Expired invitation
  ('c1480000-0000-4000-8000-000000000004', 'b1480000-0000-4000-8000-000000000001',
   'expired148@workhub.invalid', 'leader', 'a1480000-0000-4000-8000-000000000099',
   'tok-148-expired', 'pending', now() - interval '1 hour'),

  -- Revoked invitation
  ('c1480000-0000-4000-8000-000000000005', 'b1480000-0000-4000-8000-000000000001',
   'revoked148@workhub.invalid', 'leader', 'a1480000-0000-4000-8000-000000000099',
   'tok-148-revoked', 'revoked', now() + interval '7 days'),

  -- Already accepted invitation
  ('c1480000-0000-4000-8000-000000000006', 'b1480000-0000-4000-8000-000000000001',
   'accepted148@workhub.invalid', 'leader', 'a1480000-0000-4000-8000-000000000099',
   'tok-148-accepted', 'accepted', now() + interval '7 days'),

  -- Valid invitation for a user that already has a team
  ('c1480000-0000-4000-8000-000000000007', 'b1480000-0000-4000-8000-000000000001',
   'hasteam148@workhub.invalid', 'leader', 'a1480000-0000-4000-8000-000000000099',
   'tok-148-hasteam', 'pending', now() + interval '7 days'),

  -- Invitation with mixed case and leading/trailing whitespace
  ('c1480000-0000-4000-8000-000000000008', 'b1480000-0000-4000-8000-000000000001',
   '   CaseTrim148@Workhub.Invalid   ', 'leader', 'a1480000-0000-4000-8000-000000000099',
   'tok-148-casetrim', 'pending', now() + interval '7 days')
on conflict (id) do nothing;

-- =====================================================================
-- TEST 1: Unconfirmed email signup does NOT claim invitation
-- =====================================================================
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values (
  'a1480000-0000-4000-8000-000000000001',
  'unconfirmed148@workhub.invalid',
  jsonb_build_object('full_name', 'Unconfirmed User'),
  null
);

select issue148_test.check_true(
  exists (
    select 1 from public.profiles
    where id = 'a1480000-0000-4000-8000-000000000001'
      and team_id is null
      and role = 'member'
  ),
  'Unconfirmed signup profile must have team_id = NULL and role = member'
);

select issue148_test.check_true(
  exists (
    select 1 from public.team_invitations
    where id = 'c1480000-0000-4000-8000-000000000001'
      and status = 'pending'
  ),
  'Invitation must remain pending when email is unconfirmed'
);

-- Direct RPC call with unconfirmed email must return false
select issue148_test.check_true(
  not public.claim_team_invitation(
    'a1480000-0000-4000-8000-000000000001',
    'unconfirmed148@workhub.invalid'
  ),
  'claim_team_invitation must return false for unconfirmed user'
);

-- =====================================================================
-- TEST 2: Confirmed email signup (OAuth) DOES claim invitation atomically
-- =====================================================================
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values (
  'a1480000-0000-4000-8000-000000000002',
  'confirmed148@workhub.invalid',
  jsonb_build_object('full_name', 'Confirmed User'),
  now()
);

select issue148_test.check_true(
  exists (
    select 1 from public.profiles
    where id = 'a1480000-0000-4000-8000-000000000002'
      and team_id = 'b1480000-0000-4000-8000-000000000001'
      and role = 'leader'
  ),
  'Confirmed signup must immediately receive team_id and role from invitation'
);

select issue148_test.check_true(
  exists (
    select 1 from public.team_invitations
    where id = 'c1480000-0000-4000-8000-000000000002'
      and status = 'accepted'
  ),
  'Invitation must be marked as accepted after confirmed signup claim'
);

-- =====================================================================
-- TEST 3: Updating email_confirmed_at from NULL to now() claims atomically
-- =====================================================================
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values (
  'a1480000-0000-4000-8000-000000000003',
  'delayed148@workhub.invalid',
  jsonb_build_object('full_name', 'Delayed User'),
  null
);

select issue148_test.check_true(
  exists (
    select 1 from public.profiles
    where id = 'a1480000-0000-4000-8000-000000000003'
      and team_id is null
  ),
  'Before confirmation, delayed user has team_id = NULL'
);

-- User verifies their email address
update auth.users
set email_confirmed_at = now()
where id = 'a1480000-0000-4000-8000-000000000003';

select issue148_test.check_true(
  exists (
    select 1 from public.profiles
    where id = 'a1480000-0000-4000-8000-000000000003'
      and team_id = 'b1480000-0000-4000-8000-000000000001'
      and role = 'leader'
  ),
  'After email_confirmed_at transition, trigger must claim invitation atomically'
);

select issue148_test.check_true(
  exists (
    select 1 from public.team_invitations
    where id = 'c1480000-0000-4000-8000-000000000003'
      and status = 'accepted'
  ),
  'Invitation must be marked as accepted after delayed confirmation claim'
);

-- =====================================================================
-- TEST 4: Expired invitation cannot be claimed
-- =====================================================================
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values (
  'a1480000-0000-4000-8000-000000000004',
  'expired148@workhub.invalid',
  jsonb_build_object('full_name', 'Expired Invitation User'),
  now()
);

select issue148_test.check_true(
  exists (
    select 1 from public.profiles
    where id = 'a1480000-0000-4000-8000-000000000004'
      and team_id is null
      and role = 'member'
  ),
  'Expired invitation must not assign team or elevated role'
);

select issue148_test.check_true(
  not public.claim_team_invitation(
    'a1480000-0000-4000-8000-000000000004',
    'expired148@workhub.invalid'
  ),
  'claim_team_invitation must return false for expired invitation'
);

-- =====================================================================
-- TEST 5: Revoked or already accepted invitations cannot be claimed
-- =====================================================================
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values (
  'a1480000-0000-4000-8000-000000000005',
  'revoked148@workhub.invalid',
  jsonb_build_object('full_name', 'Revoked User'),
  now()
);

select issue148_test.check_true(
  exists (
    select 1 from public.profiles
    where id = 'a1480000-0000-4000-8000-000000000005'
      and team_id is null
  ),
  'Revoked invitation must not assign team'
);

select issue148_test.check_true(
  not public.claim_team_invitation(
    'a1480000-0000-4000-8000-000000000005',
    'revoked148@workhub.invalid'
  ),
  'claim_team_invitation must return false for revoked invitation'
);

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values (
  'a1480000-0000-4000-8000-000000000006',
  'accepted148@workhub.invalid',
  jsonb_build_object('full_name', 'Accepted User'),
  now()
);

select issue148_test.check_true(
  not public.claim_team_invitation(
    'a1480000-0000-4000-8000-000000000006',
    'accepted148@workhub.invalid'
  ),
  'claim_team_invitation must return false for already accepted invitation'
);

-- =====================================================================
-- TEST 6: Email mismatch cannot claim invitation
-- =====================================================================
select issue148_test.check_true(
  not public.claim_team_invitation(
    'a1480000-0000-4000-8000-000000000002',
    'completely_different@workhub.invalid'
  ),
  'claim_team_invitation must return false when email does not match auth.users'
);

-- =====================================================================
-- TEST 7: User already in a team cannot claim another team's invitation
-- =====================================================================
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values (
  'a1480000-0000-4000-8000-000000000007',
  'hasteam148@workhub.invalid',
  jsonb_build_object('full_name', 'User With Team'),
  null
);

-- Manually place user in Team Beta
update public.profiles
set team_id = 'b1480000-0000-4000-8000-000000000002', role = 'member'
where id = 'a1480000-0000-4000-8000-000000000007';

-- Now user confirms email
update auth.users
set email_confirmed_at = now()
where id = 'a1480000-0000-4000-8000-000000000007';

select issue148_test.check_true(
  exists (
    select 1 from public.profiles
    where id = 'a1480000-0000-4000-8000-000000000007'
      and team_id = 'b1480000-0000-4000-8000-000000000002'
      and role = 'member'
  ),
  'User already assigned to a team must NOT be reassigned to another team'
);

select issue148_test.check_true(
  exists (
    select 1 from public.team_invitations
    where id = 'c1480000-0000-4000-8000-000000000007'
      and status = 'pending'
  ),
  'Invitation must remain pending if target user already belongs to another team'
);

-- =====================================================================
-- TEST 8: Case insensitivity and whitespace trimming
-- =====================================================================
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values (
  'a1480000-0000-4000-8000-000000000008',
  'casetrim148@workhub.invalid',
  jsonb_build_object('full_name', 'Case Trim User'),
  now()
);

select issue148_test.check_true(
  exists (
    select 1 from public.profiles
    where id = 'a1480000-0000-4000-8000-000000000008'
      and team_id = 'b1480000-0000-4000-8000-000000000001'
      and role = 'leader'
  ),
  'Invitation claim must normalize email case and trim whitespace'
);

select issue148_test.check_true(
  exists (
    select 1 from public.team_invitations
    where id = 'c1480000-0000-4000-8000-000000000008'
      and status = 'accepted'
  ),
  'Case-mismatched whitespace invitation must be marked accepted'
);

-- =====================================================================
-- TEST 9: Cross-user claim authorization check
-- =====================================================================
-- Set local role to authenticated as user 2
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1480000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

-- Attempt to claim for user 1
select issue148_test.check_true(
  not public.claim_team_invitation(
    'a1480000-0000-4000-8000-000000000001',
    'unconfirmed148@workhub.invalid'
  ),
  'Authenticated actor cannot claim invitation on behalf of another user'
);

reset role;

-- =====================================================================
-- TEST 10: Idempotency
-- =====================================================================
select issue148_test.check_true(
  not public.claim_team_invitation(
    'a1480000-0000-4000-8000-000000000002',
    'confirmed148@workhub.invalid'
  ),
  'Subsequent call to claim_team_invitation on already claimed profile must return false'
);

select issue148_test.check_true(
  exists (
    select 1 from public.profiles
    where id = 'a1480000-0000-4000-8000-000000000002'
      and team_id = 'b1480000-0000-4000-8000-000000000001'
      and role = 'leader'
  ),
  'Profile data remains consistent and uncorrupted after repeated calls'
);

rollback;
