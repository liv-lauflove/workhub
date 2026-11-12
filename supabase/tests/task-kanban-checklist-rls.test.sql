-- Run after the task/kanban/checklist RLS migration on a Supabase development/test project.
-- Every fixture and helper is rolled back; a failed assertion raises an SQL error.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

create schema issue146_task_test;
grant usage on schema issue146_task_test to authenticated, anon, service_role;

create function issue146_task_test.check_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then
    raise exception 'Task/Kanban/Checklist RLS assertion failed: %', message;
  end if;
end;
$$;

create function issue146_task_test.expect_error(statement text, expected_state text, message text)
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
  raise exception 'Task/Kanban/Checklist RLS assertion failed: %; expected SQLSTATE %', message, expected_state;
end;
$$;

grant execute on all functions in schema issue146_task_test
  to authenticated, anon, service_role;

-- 1. Privilege and policy metadata checks
select issue146_task_test.check_true(
  not has_table_privilege('authenticated', 'public.board_columns', 'UPDATE'),
  'authenticated has no table-wide UPDATE on board_columns'
);
select issue146_task_test.check_true(
  not has_column_privilege('authenticated', 'public.board_columns', col_name, 'UPDATE'),
  'board_columns immutable column protected: ' || col_name
) from unnest(array['id', 'project_id']) as col_name;

select issue146_task_test.check_true(
  not has_table_privilege('authenticated', 'public.tasks', 'UPDATE'),
  'authenticated has no table-wide UPDATE on tasks'
);
select issue146_task_test.check_true(
  not has_column_privilege('authenticated', 'public.tasks', col_name, 'UPDATE'),
  'tasks immutable column protected: ' || col_name
) from unnest(array['id', 'project_id', 'created_by', 'created_at']) as col_name;

select issue146_task_test.check_true(
  not has_table_privilege('authenticated', 'public.task_subtasks', 'UPDATE'),
  'authenticated has no table-wide UPDATE on task_subtasks'
);
select issue146_task_test.check_true(
  not has_column_privilege('authenticated', 'public.task_subtasks', col_name, 'UPDATE'),
  'task_subtasks immutable column protected: ' || col_name
) from unnest(array['id', 'task_id', 'created_at']) as col_name;

select issue146_task_test.check_true(
  not has_function_privilege('anon', 'public.is_project_leader(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.can_access_task_checklist(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.can_verify_task_checklist(uuid)', 'EXECUTE'),
  'anonymous role cannot execute task authorization helpers'
);

select issue146_task_test.check_true(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('board_columns', 'tasks', 'task_subtasks')
      and policyname in (
        'board_columns_insert_authenticated',
        'board_columns_update_authenticated',
        'board_columns_delete_authenticated',
        'tasks_insert_authenticated',
        'tasks_update_authenticated',
        'task_subtasks_insert_authenticated',
        'task_subtasks_update_authenticated',
        'task_subtasks_delete_authenticated'
      )
  ),
  'legacy permissive write policies are removed'
);

-- 2. Synthetic test fixtures
insert into public.teams(id, name) values
  ('b1460000-0000-4000-8000-000000000001', 'issue146 synthetic team A'),
  ('b1460000-0000-4000-8000-000000000002', 'issue146 synthetic team B');

insert into auth.users(id, email, raw_user_meta_data)
select ('a1460000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'issue146-synthetic-' || n || '@workhub.invalid',
  jsonb_build_object('full_name', 'issue146 synthetic user ' || n)
from generate_series(1, 6) as n;

-- u1: Team A Leader
-- u2: Team A Developer (Member)
-- u3: Team A Tester QA (Member)
-- u4: Team A Unassigned Member
-- u5: Team B Leader
-- u6: Management Leader
update public.profiles set team_id = 'b1460000-0000-4000-8000-000000000001'
  where id in (
    'a1460000-0000-4000-8000-000000000001',
    'a1460000-0000-4000-8000-000000000002',
    'a1460000-0000-4000-8000-000000000003',
    'a1460000-0000-4000-8000-000000000004'
  );
update public.profiles set team_id = 'b1460000-0000-4000-8000-000000000002'
  where id = 'a1460000-0000-4000-8000-000000000005';
update public.profiles set team_id = 'e3333333-3333-3333-3333-333333333333'
  where id = 'a1460000-0000-4000-8000-000000000006';

update public.profiles set role = 'leader'
  where id in (
    'a1460000-0000-4000-8000-000000000001',
    'a1460000-0000-4000-8000-000000000005',
    'a1460000-0000-4000-8000-000000000006'
  );

insert into public.milestones(id, title, start_date, target_date, status, created_by)
values (
  'c1460000-0000-4000-8000-000000000001',
  'issue146 synthetic milestone',
  current_date,
  current_date + 30,
  'in_progress',
  'a1460000-0000-4000-8000-000000000001'
);

insert into public.projects(id, milestone_id, team_id, name, status, created_by) values
  ('d1460000-0000-4000-8000-000000000001', 'c1460000-0000-4000-8000-000000000001', 'b1460000-0000-4000-8000-000000000001', 'Project A', 'in_progress', 'a1460000-0000-4000-8000-000000000001'),
  ('d1460000-0000-4000-8000-000000000002', 'c1460000-0000-4000-8000-000000000001', 'b1460000-0000-4000-8000-000000000002', 'Project B', 'in_progress', 'a1460000-0000-4000-8000-000000000005');

insert into public.board_columns(id, project_id, name, position, is_default) values
  ('e1460000-0000-4000-8000-000000000001', 'd1460000-0000-4000-8000-000000000001', 'To Do', 0, true),
  ('e1460000-0000-4000-8000-000000000002', 'd1460000-0000-4000-8000-000000000001', 'In Progress', 1, false),
  ('e1460000-0000-4000-8000-000000000003', 'd1460000-0000-4000-8000-000000000001', 'Review', 2, false),
  ('e1460000-0000-4000-8000-000000000004', 'd1460000-0000-4000-8000-000000000001', 'Done', 3, false),
  ('e1460000-0000-4000-8000-000000000005', 'd1460000-0000-4000-8000-000000000002', 'To Do', 0, true);

-- 3. Authenticated role tests
set local role authenticated;

-- 3a. Member (u2) and Cross-team Leader (u5) cannot mutate Project A board_columns
select set_config('request.jwt.claim.sub', 'a1460000-0000-4000-8000-000000000002', true);
select issue146_task_test.expect_error(
  $$insert into public.board_columns(project_id, name, position) values ('d1460000-0000-4000-8000-000000000001', 'Forbidden Col', 99)$$,
  '42501', 'member cannot insert board_columns'
);
with updated_cols as (
  update public.board_columns set name = 'Hacked' where id = 'e1460000-0000-4000-8000-000000000001' returning id
)
select issue146_task_test.check_true(count(*) = 0, 'member cannot update board_columns') from updated_cols;
with deleted_cols as (
  delete from public.board_columns where id = 'e1460000-0000-4000-8000-000000000001' returning id
)
select issue146_task_test.check_true(count(*) = 0, 'member cannot delete board_columns') from deleted_cols;

select set_config('request.jwt.claim.sub', 'a1460000-0000-4000-8000-000000000005', true);
select issue146_task_test.expect_error(
  $$insert into public.board_columns(project_id, name, position) values ('d1460000-0000-4000-8000-000000000001', 'Cross Team Col', 99)$$,
  '42501', 'other team leader cannot insert board_columns into Project A'
);

-- 3b. Project A Leader (u1) and Management Leader (u6) can manage Project A board_columns
select set_config('request.jwt.claim.sub', 'a1460000-0000-4000-8000-000000000001', true);
insert into public.board_columns(id, project_id, name, position)
values ('e1460000-0000-4000-8000-000000000006', 'd1460000-0000-4000-8000-000000000001', 'QA Staging', 4);
update public.board_columns set name = 'QA Staging Ready' where id = 'e1460000-0000-4000-8000-000000000006';
delete from public.board_columns where id = 'e1460000-0000-4000-8000-000000000006';

-- 3c. Task creation guards
select set_config('request.jwt.claim.sub', 'a1460000-0000-4000-8000-000000000002', true);
select issue146_task_test.expect_error(
  $$insert into public.tasks(project_id, column_id, title, created_by)
    values ('d1460000-0000-4000-8000-000000000001', 'e1460000-0000-4000-8000-000000000001', 'Member Task', auth.uid())$$,
  '42501', 'member cannot create tasks'
);

select set_config('request.jwt.claim.sub', 'a1460000-0000-4000-8000-000000000005', true);
select issue146_task_test.expect_error(
  $$insert into public.tasks(project_id, column_id, title, created_by)
    values ('d1460000-0000-4000-8000-000000000001', 'e1460000-0000-4000-8000-000000000001', 'Cross Team Task', auth.uid())$$,
  '42501', 'other team leader cannot create tasks in Project A'
);

select set_config('request.jwt.claim.sub', 'a1460000-0000-4000-8000-000000000001', true);
select issue146_task_test.expect_error(
  $$insert into public.tasks(project_id, column_id, title, created_by)
    values ('d1460000-0000-4000-8000-000000000001', 'e1460000-0000-4000-8000-000000000005', 'Mismatched Column Task', auth.uid())$$,
  '23514', 'leader cannot create task with column from another project'
);
select issue146_task_test.expect_error(
  $$insert into public.tasks(project_id, column_id, title, assignee_id, created_by)
    values ('d1460000-0000-4000-8000-000000000001', 'e1460000-0000-4000-8000-000000000001', 'Cross Team Assignee', 'a1460000-0000-4000-8000-000000000005', auth.uid())$$,
  '23514', 'leader cannot assign task to user from another non-Management team'
);

-- Valid task creation by Team A leader (assigned to u2 as developer, no tester yet)
insert into public.tasks(
  id, project_id, column_id, title, assignee_id, developer_id, priority, created_by
) values (
  'f1460000-0000-4000-8000-000000000001',
  'd1460000-0000-4000-8000-000000000001',
  'e1460000-0000-4000-8000-000000000001',
  'Issue 146 Protected Task',
  'a1460000-0000-4000-8000-000000000002',
  'a1460000-0000-4000-8000-000000000002',
  'medium',
  auth.uid()
);

-- 3d. Unassigned member (u4) and other team leader (u5) can SELECT but cannot UPDATE task or subtasks
select set_config('request.jwt.claim.sub', 'a1460000-0000-4000-8000-000000000004', true);
select issue146_task_test.check_true(
  (select count(*) = 1 from public.tasks where id = 'f1460000-0000-4000-8000-000000000001'),
  'unassigned member retains cross-team SELECT visibility on tasks'
);
with unauthorized_update as (
  update public.tasks set description = 'unauthorized edit'
  where id = 'f1460000-0000-4000-8000-000000000001' returning id
)
select issue146_task_test.check_true(count(*) = 0, 'unassigned member cannot update task') from unauthorized_update;

select issue146_task_test.expect_error(
  $$insert into public.task_subtasks(task_id, title) values ('f1460000-0000-4000-8000-000000000001', 'unauthorized subtask')$$,
  '42501', 'unassigned member cannot insert subtask'
);

-- 3e. Assigned Developer (u2) permissions and restrictions
select set_config('request.jwt.claim.sub', 'a1460000-0000-4000-8000-000000000002', true);
update public.tasks
set dev_status = 'in_progress',
    column_id = 'e1460000-0000-4000-8000-000000000002',
    github_branch = 'feat/issue-146',
    description = 'Developer working on task'
where id = 'f1460000-0000-4000-8000-000000000001';

select issue146_task_test.expect_error(
  $$update public.tasks set priority = 'critical' where id = 'f1460000-0000-4000-8000-000000000001'$$,
  '42501', 'developer cannot escalate task priority'
);
select issue146_task_test.expect_error(
  $$update public.tasks set assignee_id = 'a1460000-0000-4000-8000-000000000004' where id = 'f1460000-0000-4000-8000-000000000001'$$,
  '42501', 'developer cannot reassign primary assignee_id'
);
select issue146_task_test.expect_error(
  $$update public.tasks set test_status = 'passed' where id = 'f1460000-0000-4000-8000-000000000001'$$,
  '42501', 'developer cannot mark task test_status as passed'
);
select issue146_task_test.expect_error(
  $$update public.tasks set column_id = 'e1460000-0000-4000-8000-000000000004' where id = 'f1460000-0000-4000-8000-000000000001'$$,
  '42501', 'developer cannot move task to Done before QA passed'
);
select issue146_task_test.expect_error(
  $$update public.tasks set dev_status = 'dev_done', test_status = 'testing', tester_id = auth.uid()
    where id = 'f1460000-0000-4000-8000-000000000001'$$,
  '42501', 'developer cannot self-assign as QA reviewer'
);

-- Developer can add uncompleted checklist items and submit PR to u3 (tester)
insert into public.task_subtasks(id, task_id, title, sort_order) values
  ('01460000-0000-4000-8000-000000000001', 'f1460000-0000-4000-8000-000000000001', 'Verify RLS policies', 0),
  ('01460000-0000-4000-8000-000000000002', 'f1460000-0000-4000-8000-000000000001', 'Temp item to remove', 1);

delete from public.task_subtasks where id = '01460000-0000-4000-8000-000000000002';

select issue146_task_test.expect_error(
  $$insert into public.task_subtasks(task_id, title, is_completed, tested_by, tested_at)
    values ('f1460000-0000-4000-8000-000000000001', 'Pre-checked item', true, auth.uid(), now())$$,
  '42501', 'developer cannot insert pre-completed checklist item'
);
with dev_toggle as (
  update public.task_subtasks
  set is_completed = true, tested_by = auth.uid(), tested_at = now()
  where id = '01460000-0000-4000-8000-000000000001' returning id
)
select issue146_task_test.check_true(count(*) = 0, 'developer cannot verify/toggle subtask checklist') from dev_toggle;

-- Developer submits PR for QA testing and assigns u3 as initial reviewer
update public.tasks
set dev_status = 'dev_done',
    test_status = 'testing',
    tester_id = 'a1460000-0000-4000-8000-000000000003',
    column_id = 'e1460000-0000-4000-8000-000000000003',
    test_notes = 'Ready for QA review'
where id = 'f1460000-0000-4000-8000-000000000001';

select issue146_task_test.expect_error(
  $$update public.tasks set tester_id = 'a1460000-0000-4000-8000-000000000004'
    where id = 'f1460000-0000-4000-8000-000000000001'$$,
  '42501', 'developer cannot overwrite tester_id once assigned'
);

-- 3f. Assigned Tester QA (u3) permissions and checklist verification
select set_config('request.jwt.claim.sub', 'a1460000-0000-4000-8000-000000000003', true);

select issue146_task_test.expect_error(
  $$update public.tasks set title = 'Tester renamed title' where id = 'f1460000-0000-4000-8000-000000000001'$$,
  '42501', 'tester cannot modify task title'
);
select issue146_task_test.expect_error(
  $$update public.tasks set test_status = 'passed', column_id = 'e1460000-0000-4000-8000-000000000004'
    where id = 'f1460000-0000-4000-8000-000000000001'$$,
  '23514', 'tester cannot mark task passed while checklist item is uncompleted'
);
select issue146_task_test.expect_error(
  $$update public.task_subtasks
    set is_completed = true, tested_by = 'a1460000-0000-4000-8000-000000000001', tested_at = now()
    where id = '01460000-0000-4000-8000-000000000001'$$,
  '42501', 'tester cannot spoof tested_by audit stamp'
);

-- Tester completes checklist item with authentic audit stamp
update public.task_subtasks
set is_completed = true, tested_by = auth.uid(), tested_at = now()
where id = '01460000-0000-4000-8000-000000000001';

-- Developer cannot delete a completed checklist item
select set_config('request.jwt.claim.sub', 'a1460000-0000-4000-8000-000000000002', true);
with dev_del_completed as (
  delete from public.task_subtasks where id = '01460000-0000-4000-8000-000000000001' returning id
)
select issue146_task_test.check_true(count(*) = 0, 'developer cannot delete completed QA checklist item') from dev_del_completed;

-- Tester merges PR (marks passed and moves to Done)
select set_config('request.jwt.claim.sub', 'a1460000-0000-4000-8000-000000000003', true);
update public.tasks
set dev_status = 'dev_done',
    test_status = 'passed',
    column_id = 'e1460000-0000-4000-8000-000000000004',
    test_notes = 'All QA checks passed'
where id = 'f1460000-0000-4000-8000-000000000001';

select issue146_task_test.check_true(
  (select test_status = 'passed' and column_id = 'e1460000-0000-4000-8000-000000000004'
   from public.tasks where id = 'f1460000-0000-4000-8000-000000000001'),
  'tester can pass and move task to Done after checklist completion'
);

-- 3g. Management Leader (u6) cross-team oversight
select set_config('request.jwt.claim.sub', 'a1460000-0000-4000-8000-000000000006', true);
update public.tasks
set priority = 'high'
where id = 'f1460000-0000-4000-8000-000000000001';

select issue146_task_test.check_true(
  (select priority = 'high' from public.tasks where id = 'f1460000-0000-4000-8000-000000000001'),
  'Management leader can update tasks across teams'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);

rollback;
select 'task, kanban, and checklist RLS database checks passed; fixtures rolled back' as result;
