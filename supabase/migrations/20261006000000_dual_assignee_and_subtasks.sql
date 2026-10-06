-- =====================================================================
-- Migration: Dual-Assignee (Developer & Tester) & Subtask Testing Checklist
-- Issue #93: [Database] Migrasi Skema Dual-Assignee (Dev & Tester) dan
--            Subtask Testing Checklist
-- =====================================================================

-- 1. Create Enums for Task Purpose and Dual-Track Statuses
do $$ begin
  create type public.task_purpose as enum ('development', 'testing', 'full_lifecycle');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_dev_status as enum ('todo', 'in_progress', 'dev_done');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_test_status as enum ('pending', 'testing', 'passed', 'failed');
exception
  when duplicate_object then null;
end $$;

-- 2. Alter tasks table to support dual-assignee & QA workflow
alter table public.tasks
  add column if not exists purpose public.task_purpose not null default 'full_lifecycle',
  add column if not exists developer_id uuid references public.profiles(id) on delete set null,
  add column if not exists tester_id uuid references public.profiles(id) on delete set null,
  add column if not exists dev_status public.task_dev_status not null default 'todo',
  add column if not exists test_status public.task_test_status not null default 'pending',
  add column if not exists test_notes text,
  add column if not exists base_points int not null default 20;

-- 3. Backfill developer_id for existing tasks using assignee_id (backwards-compatibility)
update public.tasks
set developer_id = assignee_id
where developer_id is null and assignee_id is not null;

-- 4. Create task_subtasks table for testing checklists
create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  tested_by uuid references public.profiles(id) on delete set null,
  tested_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 5. Indexes for fast query retrieval
create index if not exists idx_tasks_developer on public.tasks(developer_id);
create index if not exists idx_tasks_tester on public.tasks(tester_id);
create index if not exists idx_task_subtasks_task on public.task_subtasks(task_id);
create index if not exists idx_task_subtasks_sort on public.task_subtasks(task_id, sort_order);

-- 6. Row Level Security for task_subtasks
alter table public.task_subtasks enable row level security;

-- 6a. SELECT: all authenticated users can view subtasks
create policy "task_subtasks_select_authenticated"
  on public.task_subtasks for select
  to authenticated
  using (true);

-- 6b. INSERT: authenticated users can add checklist items
create policy "task_subtasks_insert_authenticated"
  on public.task_subtasks for insert
  to authenticated
  with check (true);

-- 6c. UPDATE: authenticated users can toggle/update checklist items
create policy "task_subtasks_update_authenticated"
  on public.task_subtasks for update
  to authenticated
  using (true)
  with check (true);

-- 6d. DELETE: authenticated users can remove checklist items
create policy "task_subtasks_delete_authenticated"
  on public.task_subtasks for delete
  to authenticated
  using (true);
