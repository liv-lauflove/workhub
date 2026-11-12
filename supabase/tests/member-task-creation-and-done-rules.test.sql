-- Test migration: Member Task Creation & Done Column Rules
-- Run on Supabase development/test project within a rollback transaction.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

create schema issue165_test;
grant usage on schema issue165_test to authenticated, anon, service_role;

create function issue165_test.check_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

create function issue165_test.expect_error(statement text, expected_state text, message text)
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
  raise exception 'Assertion failed: %; expected SQLSTATE %', message, expected_state;
end;
$$;

grant execute on all functions in schema issue165_test
  to authenticated, anon, service_role;

-- Setup fixtures
insert into public.teams(id, name) values
  ('b1650000-0000-4000-8000-000000000001', 'issue165 synthetic team A'),
  ('b1650000-0000-4000-8000-000000000002', 'issue165 synthetic team B');

insert into auth.users(id, email, raw_user_meta_data)
select ('a1650000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'issue165-synthetic-' || n || '@workhub.invalid',
  jsonb_build_object('full_name', 'issue165 synthetic user ' || n)
from generate_series(1, 6) as n;

-- u1: Team A Leader
-- u2: Team A Member (Developer)
-- u3: Team A Member (Tester QA)
-- u4: Team A Member (Unassigned to task)
-- u5: Team B Leader
-- u6: Management Leader
update public.profiles set team_id = 'b1650000-0000-4000-8000-000000000001'
  where id in (
    'a1650000-0000-4000-8000-000000000001',
    'a1650000-0000-4000-8000-000000000002',
    'a1650000-0000-4000-8000-000000000003',
    'a1650000-0000-4000-8000-000000000004'
  );
update public.profiles set team_id = 'b1650000-0000-4000-8000-000000000002'
  where id = 'a1650000-0000-4000-8000-000000000005';
update public.profiles set team_id = 'e3333333-3333-3333-3333-333333333333'
  where id = 'a1650000-0000-4000-8000-000000000006';

update public.profiles set role = 'leader'
  where id in (
    'a1650000-0000-4000-8000-000000000001',
    'a1650000-0000-4000-8000-000000000005',
    'a1650000-0000-4000-8000-000000000006'
  );

insert into public.milestones(id, title, start_date, target_date, status, created_by)
values (
  'c1650000-0000-4000-8000-000000000001',
  'issue165 synthetic milestone',
  current_date,
  current_date + 30,
  'in_progress',
  'a1650000-0000-4000-8000-000000000001'
);

insert into public.projects(id, milestone_id, team_id, name, status, created_by) values
  ('d1650000-0000-4000-8000-000000000001', 'c1650000-0000-4000-8000-000000000001', 'b1650000-0000-4000-8000-000000000001', 'Project A', 'in_progress', 'a1650000-0000-4000-8000-000000000001'),
  ('d1650000-0000-4000-8000-000000000002', 'c1650000-0000-4000-8000-000000000001', 'b1650000-0000-4000-8000-000000000002', 'Project B', 'in_progress', 'a1650000-0000-4000-8000-000000000005');

insert into public.board_columns(id, project_id, name, position, is_default) values
  ('e1650000-0000-4000-8000-000000000001', 'd1650000-0000-4000-8000-000000000001', 'To Do', 0, true),
  ('e1650000-0000-4000-8000-000000000002', 'd1650000-0000-4000-8000-000000000001', 'In Progress', 1, false),
  ('e1650000-0000-4000-8000-000000000003', 'd1650000-0000-4000-8000-000000000001', 'Review', 2, false),
  ('e1650000-0000-4000-8000-000000000004', 'd1650000-0000-4000-8000-000000000001', 'Done', 3, false),
  ('e1650000-0000-4000-8000-000000000005', 'd1650000-0000-4000-8000-000000000002', 'To Do', 0, true);

set local role authenticated;

-- Test 1: Team A Member (u2) CAN create task in Project A
select set_config('request.jwt.claim.sub', 'a1650000-0000-4000-8000-000000000002', true);
insert into public.tasks(
  id, project_id, column_id, title, assignee_id, developer_id, created_by
) values (
  'f1650000-0000-4000-8000-000000000001',
  'd1650000-0000-4000-8000-000000000001',
  'e1650000-0000-4000-8000-000000000001',
  'Member Created Task',
  'a1650000-0000-4000-8000-000000000002',
  'a1650000-0000-4000-8000-000000000002',
  auth.uid()
);

select issue165_test.check_true(
  (select count(*) = 1 from public.tasks where id = 'f1650000-0000-4000-8000-000000000001'),
  'team member can create task in own project'
);

-- Test 2: Team B Leader (u5) CANNOT create task in Project A (cross-team blocked)
select set_config('request.jwt.claim.sub', 'a1650000-0000-4000-8000-000000000005', true);
select issue165_test.expect_error(
  $$insert into public.tasks(project_id, column_id, title, created_by)
    values ('d1650000-0000-4000-8000-000000000001', 'e1650000-0000-4000-8000-000000000001', 'Forbidden Cross Team', auth.uid())$$,
  '42501', 'cross team user cannot create task in Project A'
);

-- Test 3: Member u2 can move assigned task to In Progress
select set_config('request.jwt.claim.sub', 'a1650000-0000-4000-8000-000000000002', true);
update public.tasks
set column_id = 'e1650000-0000-4000-8000-000000000002',
    dev_status = 'in_progress'
where id = 'f1650000-0000-4000-8000-000000000001';

select issue165_test.check_true(
  (select column_id = 'e1650000-0000-4000-8000-000000000002' from public.tasks where id = 'f1650000-0000-4000-8000-000000000001'),
  'assigned member can move task to In Progress'
);

-- Test 4: Member u2 CANNOT move task directly to Done (not dev_done and not passed QA)
select issue165_test.expect_error(
  $$update public.tasks set column_id = 'e1650000-0000-4000-8000-000000000004' where id = 'f1650000-0000-4000-8000-000000000001'$$,
  '23514', 'cannot move task to Done before dev is done and QA passed'
);

-- Test 5: Unassigned member (u4) CANNOT move or edit task f1
select set_config('request.jwt.claim.sub', 'a1650000-0000-4000-8000-000000000004', true);
with unassigned_move as (
  update public.tasks set column_id = 'e1650000-0000-4000-8000-000000000001'
  where id = 'f1650000-0000-4000-8000-000000000001' returning id
)
select issue165_test.check_true(count(*) = 0, 'unassigned member cannot move other member task') from unassigned_move;

-- Test 6: Member u2 finishes dev, submits for QA review to u3, adds subtask checklist
select set_config('request.jwt.claim.sub', 'a1650000-0000-4000-8000-000000000002', true);
update public.tasks
set dev_status = 'dev_done',
    test_status = 'testing',
    tester_id = 'a1650000-0000-4000-8000-000000000003',
    column_id = 'e1650000-0000-4000-8000-000000000003'
where id = 'f1650000-0000-4000-8000-000000000001';

insert into public.task_subtasks(id, task_id, title)
values ('01650000-0000-4000-8000-000000000001', 'f1650000-0000-4000-8000-000000000001', 'QA Checklist item');

-- Still cannot move to Done while testing
select issue165_test.expect_error(
  $$update public.tasks set column_id = 'e1650000-0000-4000-8000-000000000004' where id = 'f1650000-0000-4000-8000-000000000001'$$,
  '23514', 'cannot move to Done while test_status is testing'
);

-- Test 7: QA Tester u3 verifies checklist and marks passed
select set_config('request.jwt.claim.sub', 'a1650000-0000-4000-8000-000000000003', true);
update public.task_subtasks
set is_completed = true, tested_by = auth.uid(), tested_at = now()
where id = '01650000-0000-4000-8000-000000000001';

update public.tasks
set test_status = 'passed'
where id = 'f1650000-0000-4000-8000-000000000001';

-- Now task CAN be moved to Done
update public.tasks
set column_id = 'e1650000-0000-4000-8000-000000000004'
where id = 'f1650000-0000-4000-8000-000000000001';

select issue165_test.check_true(
  (select column_id = 'e1650000-0000-4000-8000-000000000004' and test_status = 'passed' from public.tasks where id = 'f1650000-0000-4000-8000-000000000001'),
  'task moved to Done successfully after QA passed and checklist completed'
);

reset role;
rollback;
select 'Issue 165 database checks passed; fixtures rolled back' as result;
