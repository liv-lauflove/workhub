-- Run after the profile-permissions migration on a Supabase development/test project.
-- Every fixture and helper is rolled back; a failed assertion raises an SQL error.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

create schema issue145_profile_test;
grant usage on schema issue145_profile_test to authenticated, anon, service_role;

create function issue145_profile_test.check_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then
    raise exception 'Profile permission assertion failed: %', message;
  end if;
end;
$$;

create function issue145_profile_test.expect_error(statement text, expected_state text, message text)
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
  raise exception 'Profile permission assertion failed: %; expected SQLSTATE %', message, expected_state;
end;
$$;

grant execute on all functions in schema issue145_profile_test
  to authenticated, anon, service_role;

select issue145_profile_test.check_true(
  not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'authenticated has no table-wide UPDATE'
);
select issue145_profile_test.check_true(
  not has_any_column_privilege('authenticated', 'public.profiles', 'INSERT'),
  'authenticated cannot insert profiles, including through legacy column grants'
);
select issue145_profile_test.check_true(
  not has_column_privilege('authenticated', 'public.profiles', column_name, 'UPDATE'),
  'protected column: ' || column_name
) from unnest(array['id', 'role', 'team_id', 'capacity_points', 'created_at']) as column_name;
select issue145_profile_test.check_true(
  has_column_privilege('authenticated', 'public.profiles', column_name, 'UPDATE'),
  'personal column remains writable: ' || column_name
) from unnest(array['full_name', 'avatar_url', 'github_username', 'phone', 'position']) as column_name;
select issue145_profile_test.check_true(
  not has_function_privilege('anon', 'public.update_team_member(uuid,uuid,public.user_role,integer)', 'EXECUTE'),
  'anonymous clients cannot execute the privileged RPC'
);
select issue145_profile_test.check_true(
  has_function_privilege('authenticated', 'public.update_team_member(uuid,uuid,public.user_role,integer)', 'EXECUTE'),
  'authenticated clients can reach the RPC authorization checks'
);
select issue145_profile_test.check_true(
  not has_function_privilege('service_role', 'public.update_team_member(uuid,uuid,public.user_role,integer)', 'EXECUTE'),
  'the new RPC is not exposed through default service-role execution grants'
);
select issue145_profile_test.check_true(
  not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
    and policyname in ('profiles_insert_own', 'profiles_update_leader')),
  'legacy insert and leader row-update policies are removed'
);

insert into public.teams(id, name) values
  ('b1450000-0000-4000-8000-000000000001', 'issue145 synthetic team A'),
  ('b1450000-0000-4000-8000-000000000002', 'issue145 synthetic team B');
insert into auth.users(id, email, raw_user_meta_data)
select ('a1450000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'issue145-synthetic-' || n || '@workhub.invalid',
  jsonb_build_object('full_name', 'issue145 synthetic user ' || n, 'role', 'leader',
    'team_id', 'e3333333-3333-3333-3333-333333333333')
from generate_series(1, 7) as n;
select issue145_profile_test.check_true(
  (select count(*) = 7 from public.profiles where id::text like 'a1450000-%' and role = 'member' and team_id is null),
  'auth trigger creates profiles without trusting metadata role/team'
);
update public.profiles set team_id = 'b1450000-0000-4000-8000-000000000001'
  where id in ('a1450000-0000-4000-8000-000000000001', 'a1450000-0000-4000-8000-000000000002');
update public.profiles set team_id = 'b1450000-0000-4000-8000-000000000002'
  where id in ('a1450000-0000-4000-8000-000000000003', 'a1450000-0000-4000-8000-000000000004');
update public.profiles set team_id = 'e3333333-3333-3333-3333-333333333333'
  where id in ('a1450000-0000-4000-8000-000000000005', 'a1450000-0000-4000-8000-000000000007');
update public.profiles set role = 'leader'
  where id in ('a1450000-0000-4000-8000-000000000002', 'a1450000-0000-4000-8000-000000000004', 'a1450000-0000-4000-8000-000000000005');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1450000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"role":"authenticated","user_role":"leader"}', true);
select issue145_profile_test.expect_error(
  $$update public.profiles set role = 'leader' where id = auth.uid()$$,
  '42501', 'member cannot change own role'
);
select issue145_profile_test.expect_error(
  $$update public.profiles set team_id = 'e3333333-3333-3333-3333-333333333333' where id = auth.uid()$$,
  '42501', 'member cannot change own team'
);
select issue145_profile_test.expect_error(
  $$update public.profiles set capacity_points = 900 where id = auth.uid()$$,
  '42501', 'member cannot change own capacity'
);
select issue145_profile_test.expect_error(
  $$update public.profiles set full_name = 'forbidden mixed update', role = 'leader' where id = auth.uid()$$,
  '42501', 'mixed personal and protected update is rejected atomically'
);
select issue145_profile_test.expect_error(
  $$insert into public.profiles(id, full_name) values (auth.uid(), 'direct insert')$$,
  '42501', 'direct profile INSERT is denied'
);
update public.profiles set full_name = 'allowed personal name', phone = 'test-phone',
  position = 'test-position', github_username = 'issue145-test', avatar_url = 'https://example.invalid/avatar'
  where id = auth.uid();
select issue145_profile_test.check_true(
  (select full_name = 'allowed personal name' and role = 'member' from public.profiles where id = auth.uid()),
  'personal fields remain writable without altering role'
);
with changed as (
  update public.profiles set full_name = 'unauthorized name'
  where id = 'a1450000-0000-4000-8000-000000000003' returning id
) select issue145_profile_test.check_true(count(*) = 0, 'personal updates remain restricted to own row') from changed;
select issue145_profile_test.expect_error(
  $$select public.update_team_member(auth.uid(), 'b1450000-0000-4000-8000-000000000001', 'leader')$$,
  '42501', 'RPC derives actor role from the database, not forged claims'
);

select set_config('request.jwt.claim.sub', 'a1450000-0000-4000-8000-000000000006', true);
select issue145_profile_test.expect_error(
  $$select public.update_team_member('a1450000-0000-4000-8000-000000000001', 'b1450000-0000-4000-8000-000000000001', 'leader')$$,
  '42501', 'an actor without a team cannot manage another team'
);
select set_config('request.jwt.claim.sub', 'a1450000-0000-4000-8000-000000000002', true);
select issue145_profile_test.expect_error(
  $$update public.profiles set role = 'member' where id = auth.uid()$$,
  '42501', 'leaders also use the RPC instead of direct protected-column updates'
);
select issue145_profile_test.check_true(
  public.update_team_member('a1450000-0000-4000-8000-000000000001', 'b1450000-0000-4000-8000-000000000001', 'leader') = 'a1450000-0000-4000-8000-000000000001'::uuid,
  'leader can update a member of the same team and receives the changed ID'
);
select public.update_team_member('a1450000-0000-4000-8000-000000000001', 'b1450000-0000-4000-8000-000000000001', 'member');
select public.update_team_member('a1450000-0000-4000-8000-000000000001', 'b1450000-0000-4000-8000-000000000001', p_capacity_points => 150);
select issue145_profile_test.check_true(
  (select role = 'member' and capacity_points = 150 from public.profiles where id = 'a1450000-0000-4000-8000-000000000001'),
  'authorized updates change only the requested sensitive fields'
);
select issue145_profile_test.expect_error(
  $$select public.update_team_member('a1450000-0000-4000-8000-000000000003', 'b1450000-0000-4000-8000-000000000002', 'leader')$$,
  '42501', 'ordinary leader cannot manage another team'
);
select issue145_profile_test.expect_error(
  $$select public.update_team_member('a1450000-0000-4000-8000-000000000099', 'b1450000-0000-4000-8000-000000000001', 'leader')$$,
  'P0002', 'missing target fails instead of reporting success'
);
select issue145_profile_test.expect_error(
  $$select public.update_team_member(auth.uid(), 'b1450000-0000-4000-8000-000000000001', 'member')$$,
  '23514', 'last leader cannot demote themselves'
);
select issue145_profile_test.expect_error(
  $$select public.update_team_member('a1450000-0000-4000-8000-000000000001', 'b1450000-0000-4000-8000-000000000001', p_capacity_points => 1001)$$,
  '22023', 'capacity limit is enforced in the RPC'
);
select issue145_profile_test.expect_error(
  $$select public.update_team_member('a1450000-0000-4000-8000-000000000001', 'b1450000-0000-4000-8000-000000000001')$$,
  '22023', 'empty changes are rejected'
);

select set_config('request.jwt.claim.sub', 'a1450000-0000-4000-8000-000000000005', true);
select issue145_profile_test.check_true(
  public.update_team_member('a1450000-0000-4000-8000-000000000003', 'b1450000-0000-4000-8000-000000000002', p_capacity_points => 250) = 'a1450000-0000-4000-8000-000000000003'::uuid,
  'Management leader can manage an authorized target across teams'
);
select issue145_profile_test.expect_error(
  $$select public.update_team_member('a1450000-0000-4000-8000-000000000001', 'b1450000-0000-4000-8000-000000000002', 'leader')$$,
  'P0002', 'target ID and expected team must match even for Management'
);
select set_config('request.jwt.claim.sub', 'a1450000-0000-4000-8000-000000000007', true);
select issue145_profile_test.expect_error(
  $$select public.update_team_member('a1450000-0000-4000-8000-000000000003', 'b1450000-0000-4000-8000-000000000002', 'leader')$$,
  '42501', 'Management membership alone does not bypass the leader requirement'
);

select set_config('request.jwt.claim.sub', 'a1450000-0000-4000-8000-000000000002', true);
select public.update_team_member('a1450000-0000-4000-8000-000000000001', 'b1450000-0000-4000-8000-000000000001', 'leader');
select public.update_team_member(auth.uid(), 'b1450000-0000-4000-8000-000000000001', 'member');
select issue145_profile_test.expect_error(
  $$select public.update_team_member('a1450000-0000-4000-8000-000000000001', 'b1450000-0000-4000-8000-000000000001', p_capacity_points => 200)$$,
  '42501', 'a demoted actor cannot retain cached leadership privileges'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select issue145_profile_test.expect_error(
  $$select public.update_team_member('a1450000-0000-4000-8000-000000000001', 'b1450000-0000-4000-8000-000000000001', 'leader')$$,
  '42501', 'anonymous execution is denied'
);
reset role;
set local role service_role;
update public.profiles set capacity_points = 175
  where id = 'a1450000-0000-4000-8000-000000000001';
select issue145_profile_test.check_true(
  (select capacity_points = 175 from public.profiles where id = 'a1450000-0000-4000-8000-000000000001'),
  'trusted server operations retain their existing privileges'
);
reset role;

rollback;
select 'profile permission database checks passed; fixtures rolled back' as result;
