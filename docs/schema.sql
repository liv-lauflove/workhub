-- =====================================================================
-- Workhub (Task & Performance Dashboard): Database Schema (Supabase Postgres)
-- =====================================================================
-- Referensi skema lengkap yang mencakup seluruh 17 migrasi aktif:
-- - Dynamic Teams (Management role governance)
-- - Extended Profiles (phone, position, capacity_points)
-- - Milestones, Projects, Custom Kanban Board Columns
-- - Tasks dengan Dual-Assignee (Developer & Tester/QA), Multi-Repo GitHub,
--   Base Points, CS Complaint Origin, Subtasks, Dependencies, Attachments,
--   Comments, dan Automatic Activity Log Trigger
-- - Notifications, GitHub Webhook Commits, & AI Layer (Cache, Warnings, Overrides)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Teams (Dynamic Teams, dikelola oleh Leader dengan posisi Management)
-- ---------------------------------------------------------------------
create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (length(trim(name)) >= 2),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Profiles (extends Supabase auth.users)
-- ---------------------------------------------------------------------
create type user_role as enum ('leader', 'member');

create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text not null,
  email            text,
  role             user_role not null default 'member',
  team_id          uuid references teams(id) on delete set null,
  phone            text,
  position         text,                        -- Contoh: 'Management', 'Frontend Developer', 'QA Engineer'
  capacity_points  int not null default 20,     -- Kapasitas poin individu per anggota
  github_username  text,
  avatar_url       text,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Team Invitations (Leader mengundang anggota baru via email)
-- ---------------------------------------------------------------------
create type invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');

create table team_invitations (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references teams(id) on delete cascade,
  email        text not null,
  role         user_role not null default 'member',
  invited_by   uuid not null references profiles(id),
  token        text not null unique,
  status       invitation_status not null default 'pending',
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '7 days')
);

-- ---------------------------------------------------------------------
-- 4. GitHub Integrations (Token terenkripsi opsional untuk background sync)
-- ---------------------------------------------------------------------
create table github_integrations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade unique,
  github_user_id text not null,
  access_token   text not null,
  scope          text,
  connected_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Priority Levels & Team Capacity Settings
-- ---------------------------------------------------------------------
create table priority_levels (
  level      text primary key,      -- 'critical' | 'high' | 'medium' | 'low'
  weight     int not null,
  sort_order int not null
);

insert into priority_levels (level, weight, sort_order) values
  ('critical', 4, 1),
  ('high',     3, 2),
  ('medium',   2, 3),
  ('low',      1, 4)
on conflict (level) do nothing;

create table capacity_settings (
  team_id         uuid primary key references teams(id) on delete cascade,
  baseline_points int not null default 20,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. Milestones (Target strategis tingkat atas, lintas tim)
-- ---------------------------------------------------------------------
create type milestone_status as enum ('planned', 'in_progress', 'completed', 'at_risk');

create table milestones (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  pic_id         uuid references profiles(id) on delete set null,
  start_date     date not null,
  target_date    date not null,
  status         milestone_status not null default 'planned',
  archived_at    timestamptz,
  created_by     uuid not null references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. Projects (Level menengah, terikat ke satu Milestone dan satu Tim)
-- ---------------------------------------------------------------------
create type project_status as enum ('planned', 'in_progress', 'completed', 'blocked');

create table projects (
  id            uuid primary key default gen_random_uuid(),
  milestone_id  uuid not null references milestones(id) on delete cascade,
  team_id       uuid not null references teams(id),
  name          text not null,
  description   text,
  pic_id        uuid references profiles(id) on delete set null,
  start_date    date,
  end_date      date,
  status        project_status not null default 'planned',
  archived_at   timestamptz,
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. Board Columns (Kolom Kanban kustom per Project)
-- ---------------------------------------------------------------------
create table board_columns (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,          -- Default: 'To Do', 'In Progress', 'Review', 'Done'
  position    int not null,
  is_default  boolean not null default false,
  unique (project_id, position)
);

-- ---------------------------------------------------------------------
-- 9. Tasks (Unit kerja terkecil, mendukung Dual-Assignee Dev & QA + Multi-Repo)
-- ---------------------------------------------------------------------
create type task_origin as enum ('normal', 'cs_complaint');

create table tasks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade,
  column_id       uuid not null references board_columns(id),
  title           text not null,
  description     text,
  assignee_id     uuid references profiles(id) on delete set null,
  developer_id    uuid references profiles(id) on delete set null,
  tester_id       uuid references profiles(id) on delete set null,
  dev_status      text default 'pending',
  test_status     text default 'pending',
  priority        text not null references priority_levels(level) default 'medium',
  base_points     int not null default 1,
  origin          task_origin not null default 'normal',
  origin_note     text,
  github_branch   text,
  github_repo     text check (github_repo is null or github_repo ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  start_date      date,
  due_date        date,
  position        int not null default 0,
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_tasks_assignee on tasks(assignee_id);
create index idx_tasks_developer on tasks(developer_id);
create index idx_tasks_tester on tasks(tester_id);
create index idx_tasks_project on tasks(project_id);
create index idx_tasks_column on tasks(column_id);
create index idx_tasks_github_branch_repo on tasks(github_branch, github_repo) where github_branch is not null;

-- ---------------------------------------------------------------------
-- 10. Task Subtasks (Checklist pekerjaan di dalam sebuah Task)
-- ---------------------------------------------------------------------
create table task_subtasks (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  title        text not null,
  is_completed boolean not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_task_subtasks_task on task_subtasks(task_id);

-- ---------------------------------------------------------------------
-- 11. Task Comments, Attachments, Dependencies, Activity Log, & Commits
-- ---------------------------------------------------------------------
create table task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  author_id   uuid not null references profiles(id),
  content     text not null,
  created_at  timestamptz not null default now()
);

create table task_attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  uploaded_by  uuid not null references profiles(id),
  file_url     text not null,
  file_name    text not null,
  file_type    text,
  file_size    int,
  created_at   timestamptz not null default now()
);

create table task_dependencies (
  id                 uuid primary key default gen_random_uuid(),
  task_id            uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  created_at         timestamptz not null default now(),
  check (task_id <> depends_on_task_id),
  unique (task_id, depends_on_task_id)
);

create table activity_log (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  actor_id     uuid not null references profiles(id),
  field_name   text not null,
  old_value    text,
  new_value    text,
  created_at   timestamptz not null default now()
);

create index idx_activity_log_task on activity_log(task_id);

create table github_commits (
  id               uuid primary key default gen_random_uuid(),
  task_id          uuid not null references tasks(id) on delete cascade,
  commit_sha       text not null,
  commit_message   text,
  author_username  text,
  committed_at     timestamptz,
  url              text,
  unique (task_id, commit_sha)
);

-- ---------------------------------------------------------------------
-- 12. Notifications (In-App)
-- ---------------------------------------------------------------------
create type notification_type as enum (
  'task_assigned', 'task_mentioned', 'task_status_changed', 'member_overload'
);

create table notifications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  type             notification_type not null,
  title            text not null,
  body             text,
  related_task_id  uuid references tasks(id) on delete cascade,
  is_read          boolean not null default false,
  created_at       timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, is_read);

-- ---------------------------------------------------------------------
-- 13. AI Features (Query Cache, Warnings, & Guardrail Overrides)
-- ---------------------------------------------------------------------
create table ai_query_cache (
  id            uuid primary key default gen_random_uuid(),
  query_hash    text not null unique,
  query_text    text not null,
  response_text text not null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz
);

create table ai_warnings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  team_id      uuid references teams(id) on delete cascade,
  quarter      text not null,
  message      text not null,
  created_at   timestamptz not null default now()
);

create table ai_suggestion_overrides (
  id                       uuid primary key default gen_random_uuid(),
  task_id                  uuid not null references tasks(id) on delete cascade,
  suggested_priority       text references priority_levels(level),
  suggested_duration_hours numeric,
  final_priority           text references priority_levels(level),
  final_duration_hours     numeric,
  overridden_by            uuid references profiles(id),
  created_at               timestamptz not null default now()
);
