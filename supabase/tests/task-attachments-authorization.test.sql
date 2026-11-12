-- =====================================================================
-- Test Suite: Task Attachments Object Authorization and Invariant Verification
-- Issue #147: fix(tasks): terapkan otorisasi objek pada seluruh operasi lampiran
-- Audit Reference: S03
-- =====================================================================

begin;

create schema if not exists issue147_test;

create or replace function issue147_test.check_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not condition then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

create or replace function issue147_test.expect_error(
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

grant usage on schema issue147_test to authenticated, anon, service_role;
grant execute on all functions in schema issue147_test to authenticated, anon, service_role;

-- 1. Setup teams
insert into public.teams(id, name) values
  ('b1470000-0000-4000-8000-000000000001', 'issue147 synthetic team A'),
  ('b1470000-0000-4000-8000-000000000002', 'issue147 synthetic team B')
on conflict (id) do nothing;

-- 2. Setup synthetic users in auth.users
insert into auth.users(id, email, raw_user_meta_data)
select ('a1470000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'issue147-synthetic-' || n || '@workhub.invalid',
  jsonb_build_object('full_name', 'issue147 synthetic user ' || n)
from generate_series(1, 5) as n
on conflict (id) do nothing;

-- u1: Team A Leader
-- u2: Team A Member (Uploader)
-- u3: Team A Member (Other - Not Uploader)
-- u4: Team B Member (Cross-team)
-- u5: Management Leader
update public.profiles set
  role = 'leader',
  team_id = 'b1470000-0000-4000-8000-000000000001'
where id = 'a1470000-0000-4000-8000-000000000001';

update public.profiles set
  role = 'member',
  team_id = 'b1470000-0000-4000-8000-000000000001'
where id in ('a1470000-0000-4000-8000-000000000002', 'a1470000-0000-4000-8000-000000000003');

update public.profiles set
  role = 'member',
  team_id = 'b1470000-0000-4000-8000-000000000002'
where id = 'a1470000-0000-4000-8000-000000000004';

update public.profiles set
  role = 'leader',
  team_id = (select id from public.teams where name = 'Management' limit 1)
where id = 'a1470000-0000-4000-8000-000000000005';

-- 3. Setup Milestone, Project, Columns, and Tasks
insert into public.milestones(id, title, status, start_date, target_date, created_by) values
  ('f1470000-0000-4000-8000-000000000001', 'Milestone Alpha', 'in_progress', '2026-11-01', '2026-11-30', 'a1470000-0000-4000-8000-000000000001');

insert into public.projects(id, milestone_id, team_id, name, status, created_by) values
  ('c1470000-0000-4000-8000-000000000001', 'f1470000-0000-4000-8000-000000000001', 'b1470000-0000-4000-8000-000000000001', 'issue147 synthetic project Alpha', 'in_progress', 'a1470000-0000-4000-8000-000000000001'),
  ('c1470000-0000-4000-8000-000000000002', 'f1470000-0000-4000-8000-000000000001', 'b1470000-0000-4000-8000-000000000002', 'issue147 synthetic project Beta', 'in_progress', 'a1470000-0000-4000-8000-000000000004');

insert into public.board_columns(id, project_id, name, position, is_default) values
  ('f1470000-0000-4000-8000-000000000001', 'c1470000-0000-4000-8000-000000000001', 'To Do', 0, true),
  ('f1470000-0000-4000-8000-000000000002', 'c1470000-0000-4000-8000-000000000002', 'To Do', 0, true);

insert into public.tasks(id, project_id, column_id, title, assignee_id, dev_status, test_status, created_by) values
  ('d1470000-0000-4000-8000-000000000001', 'c1470000-0000-4000-8000-000000000001', 'f1470000-0000-4000-8000-000000000001', 'issue147 synthetic task Alpha', 'a1470000-0000-4000-8000-000000000002', 'in_progress', 'pending', 'a1470000-0000-4000-8000-000000000001'),
  ('d1470000-0000-4000-8000-000000000002', 'c1470000-0000-4000-8000-000000000002', 'f1470000-0000-4000-8000-000000000002', 'issue147 synthetic task Beta', 'a1470000-0000-4000-8000-000000000004', 'in_progress', 'pending', 'a1470000-0000-4000-8000-000000000004');

set local role authenticated;

-- =====================================================================
-- TEST 1: Legitimate upload by Squad Alpha Member (u2)
-- =====================================================================
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000002', true);

insert into public.task_attachments (
  id, task_id, uploaded_by, file_url, file_name, file_type, file_size
) values (
  'e1470000-0000-4000-8000-000000000001',
  'd1470000-0000-4000-8000-000000000001',
  'a1470000-0000-4000-8000-000000000002',
  'tasks/d1470000-0000-4000-8000-000000000001/1700000000-spec.pdf',
  'spec.pdf',
  'application/pdf',
  102400
);

select issue147_test.check_true(
  (select count(*) = 1 from public.task_attachments where id = 'e1470000-0000-4000-8000-000000000001'),
  'Squad Alpha member should successfully insert legitimate attachment'
);

-- =====================================================================
-- TEST 2: Cross-team member (Beta Squad u4) cannot insert attachment into Alpha task
-- =====================================================================
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000004', true);

select issue147_test.expect_error(
  $$insert into public.task_attachments (
      id, task_id, uploaded_by, file_url, file_name, file_type, file_size
    ) values (
      'e1470000-0000-4000-8000-000000000099',
      'd1470000-0000-4000-8000-000000000001',
      'a1470000-0000-4000-8000-000000000004',
      'tasks/d1470000-0000-4000-8000-000000000001/attack.pdf',
      'attack.pdf',
      'application/pdf',
      102400
    )$$,
  '42501',
  'Beta Squad member must not be able to insert attachment into Alpha task'
);

-- =====================================================================
-- TEST 3: Path manipulation attack (Task A upload claiming Task B storage path)
-- =====================================================================
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000002', true);

select issue147_test.expect_error(
  $$insert into public.task_attachments (
      id, task_id, uploaded_by, file_url, file_name, file_type, file_size
    ) values (
      'e1470000-0000-4000-8000-000000000098',
      'd1470000-0000-4000-8000-000000000001',
      'a1470000-0000-4000-8000-000000000002',
      'tasks/d1470000-0000-4000-8000-000000000002/victim-file.pdf',
      'victim-file.pdf',
      'application/pdf',
      102400
    )$$,
  '22023',
  'Mismatched task storage path must be rejected'
);

-- =====================================================================
-- TEST 4: File size exceeding 5MB (e.g. 6MB) must be rejected
-- =====================================================================
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000002', true);

select issue147_test.expect_error(
  $$insert into public.task_attachments (
      id, task_id, uploaded_by, file_url, file_name, file_type, file_size
    ) values (
      'e1470000-0000-4000-8000-000000000097',
      'd1470000-0000-4000-8000-000000000001',
      'a1470000-0000-4000-8000-000000000002',
      'tasks/d1470000-0000-4000-8000-000000000001/oversized.pdf',
      'oversized.pdf',
      'application/pdf',
      6291456
    )$$,
  '22023',
  'File size over 5MB must be rejected'
);

-- =====================================================================
-- TEST 5: Uploaded_by spoofing must be rejected
-- =====================================================================
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000002', true);

select issue147_test.expect_error(
  $$insert into public.task_attachments (
      id, task_id, uploaded_by, file_url, file_name, file_type, file_size
    ) values (
      'e1470000-0000-4000-8000-000000000096',
      'd1470000-0000-4000-8000-000000000001',
      'a1470000-0000-4000-8000-000000000001',
      'tasks/d1470000-0000-4000-8000-000000000001/spoofed.pdf',
      'spoofed.pdf',
      'application/pdf',
      102400
    )$$,
  '42501',
  'Uploaded_by mismatching auth uid must be rejected'
);

-- =====================================================================
-- TEST 6: Immutability - Attempt to update storage path of existing record
-- =====================================================================
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000002', true);

select issue147_test.expect_error(
  $$update public.task_attachments
    set file_url = 'tasks/d1470000-0000-4000-8000-000000000001/tampered.pdf'
    where id = 'e1470000-0000-4000-8000-000000000001'$$,
  '42501',
  'Updating attachment storage path must be rejected'
);

-- =====================================================================
-- TEST 7: Unauthorized delete by other team member (u3)
-- =====================================================================
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000003', true);

select issue147_test.expect_error(
  $$delete from public.task_attachments where id = 'e1470000-0000-4000-8000-000000000001'$$,
  '42501',
  'Non-uploader member should not be able to delete attachment'
);

-- =====================================================================
-- TEST 8: Unauthorized delete by cross-team member (Beta Squad u4)
-- RLS filters out rows of other teams, so delete touches 0 rows and record is preserved
-- =====================================================================
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000004', true);

delete from public.task_attachments where id = 'e1470000-0000-4000-8000-000000000001';

-- Switch back to u2 (Alpha member) to verify record is intact
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000002', true);
select issue147_test.check_true(
  (select count(*) = 1 from public.task_attachments where id = 'e1470000-0000-4000-8000-000000000001'),
  'Cross-team member should not be able to delete attachment (preserved by RLS)'
);

-- =====================================================================
-- TEST 9: Squad Alpha Leader (u1) CAN delete Squad Alpha attachment
-- =====================================================================
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000001', true);

delete from public.task_attachments where id = 'e1470000-0000-4000-8000-000000000001';

select issue147_test.check_true(
  (select count(*) = 0 from public.task_attachments where id = 'e1470000-0000-4000-8000-000000000001'),
  'Squad Alpha leader should be authorized to delete team attachment'
);

-- Re-insert attachment for test 10 and 11
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000002', true);
insert into public.task_attachments (
  id, task_id, uploaded_by, file_url, file_name, file_type, file_size
) values (
  'e1470000-0000-4000-8000-000000000002',
  'd1470000-0000-4000-8000-000000000001',
  'a1470000-0000-4000-8000-000000000002',
  'tasks/d1470000-0000-4000-8000-000000000001/second.pdf',
  'second.pdf',
  'application/pdf',
  102400
);

-- =====================================================================
-- TEST 10: Management user (u5) CAN delete Squad Alpha attachment
-- =====================================================================
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000005', true);

delete from public.task_attachments where id = 'e1470000-0000-4000-8000-000000000002';

select issue147_test.check_true(
  (select count(*) = 0 from public.task_attachments where id = 'e1470000-0000-4000-8000-000000000002'),
  'Management user should be authorized to delete any squad attachment'
);

-- Re-insert attachment for test 11 (uploader self-delete)
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000002', true);
insert into public.task_attachments (
  id, task_id, uploaded_by, file_url, file_name, file_type, file_size
) values (
  'e1470000-0000-4000-8000-000000000003',
  'd1470000-0000-4000-8000-000000000001',
  'a1470000-0000-4000-8000-000000000002',
  'tasks/d1470000-0000-4000-8000-000000000001/third.pdf',
  'third.pdf',
  'application/pdf',
  102400
);

-- =====================================================================
-- TEST 11: Uploader (u2) CAN delete own attachment
-- =====================================================================
select set_config('request.jwt.claim.sub', 'a1470000-0000-4000-8000-000000000002', true);

delete from public.task_attachments where id = 'e1470000-0000-4000-8000-000000000003';

select issue147_test.check_true(
  (select count(*) = 0 from public.task_attachments where id = 'e1470000-0000-4000-8000-000000000003'),
  'Uploader should be authorized to delete own attachment'
);

rollback;
