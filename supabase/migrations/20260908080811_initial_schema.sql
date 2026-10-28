-- =====================================================================
-- Task & Performance Dashboard — Database Schema (Postgres / Supabase)
-- FINAL v2 — includes notifications, activity log, attachments,
-- task dependencies, team invitations, AI override log, archiving
-- =====================================================================
-- Assumes Supabase Auth (auth.users) handles login/OAuth (Google/GitHub).
-- If you switch to NextAuth + adapter instead, swap the FK target on
-- profiles.id from auth.users(id) to the adapter's users table.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------
create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (name in ('Aegis', 'Sentinel')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Profiles (extends Supabase auth.users with app-specific fields)
-- ---------------------------------------------------------------------
create type user_role as enum ('leader', 'member');

create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text not null,
  role             user_role not null default 'member',
  team_id          uuid references teams(id) on delete set null,
  github_username  text,
  avatar_url       text,
  created_at       timestamptz not null default now()
);

-- Team invitations — leader invites new members by email
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

-- Long-lived GitHub access token for background jobs (commit polling)
-- outside an active user session. Only populate if genuinely needed.
create table github_integrations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade unique,
  github_user_id text not null,
  access_token   text not null, -- store encrypted (pgsodium / KMS), never expose via API
  scope          text,
  connected_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Priority levels (configurable weights, used for workload capacity)
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
  ('low',      1, 4);

-- Per-team baseline capacity, used to compute workload %.
create table capacity_settings (
  team_id         uuid primary key references teams(id) on delete cascade,
  baseline_points int not null default 20,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Milestones (top level — strategic target, not team-scoped)
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
  archived_at    timestamptz,           -- null = active, set = archived
  created_by     uuid not null references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Projects (mid level — belongs to one team, contributes to a milestone)
-- ---------------------------------------------------------------------
create type project_status as enum ('planned', 'in_progress', 'completed', 'blocked');

create table projects (
  id            uuid primary key default gen_random_uuid(),
  milestone_id  uuid not null references milestones(id) on delete cascade,
  team_id       uuid not null references teams(id),
  name          text not null,
  description   text,
  pic_id        uuid references profiles(id) on delete set null,
  status        project_status not null default 'planned',
  archived_at   timestamptz,           -- null = active, set = archived
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Kanban board columns — custom per project, like GitHub Projects
-- ---------------------------------------------------------------------
create table board_columns (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,          -- e.g. 'To Do', 'In Progress', 'Review', 'Done', or custom
  position    int not null,           -- display order, drag-and-drop reorders this
  is_default  boolean not null default false,
  unique (project_id, position)
);

-- ---------------------------------------------------------------------
-- Tasks (smallest unit — kanban card)
-- ---------------------------------------------------------------------
create type task_origin as enum ('normal', 'cs_complaint');

create table tasks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade, -- nullable: task may be unassigned to a project initially
  column_id       uuid not null references board_columns(id),
  title           text not null,
  description     text,
  assignee_id     uuid references profiles(id) on delete set null,
  priority        text not null references priority_levels(level) default 'medium',
  origin          task_origin not null default 'normal',
  origin_note     text,             -- free text if origin = 'cs_complaint'
  github_branch   text,
  due_date        date,
  created_by      uuid not null references profiles(id), -- must be a 'leader' (enforce in app/RLS)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_tasks_assignee on tasks(assignee_id);
create index idx_tasks_project on tasks(project_id);
create index idx_tasks_column on tasks(column_id);

-- Discussion thread on each task card
create table task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  author_id   uuid not null references profiles(id),
  content     text not null,
  created_at  timestamptz not null default now()
);

-- File attachments on a task (screenshots, documents)
create table task_attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  uploaded_by  uuid not null references profiles(id),
  file_url     text not null,       -- Supabase Storage path/URL
  file_name    text not null,
  file_type    text,
  file_size    int,                 -- bytes; enforce max size in app layer
  created_at   timestamptz not null default now()
);

-- Task dependencies — self-referencing "blocked by" relation
create table task_dependencies (
  id                 uuid primary key default gen_random_uuid(),
  task_id            uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  created_at         timestamptz not null default now(),
  check (task_id <> depends_on_task_id),
  unique (task_id, depends_on_task_id)
);

-- Generic audit trail for task field changes
create table activity_log (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  actor_id     uuid not null references profiles(id),
  field_name   text not null,       -- e.g. 'assignee_id', 'priority', 'column_id', 'due_date'
  old_value    text,
  new_value    text,
  created_at   timestamptz not null default now()
);

create index idx_activity_log_task on activity_log(task_id);

-- Cached GitHub commits linked to a task (populated via webhook/poll)
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
-- Notifications (in-app)
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
-- AI features
-- ---------------------------------------------------------------------
-- Cache for chatbot queries to save LLM API cost on repeated/similar asks
create table ai_query_cache (
  id            uuid primary key default gen_random_uuid(),
  query_hash    text not null unique, -- hash of normalized query text
  query_text    text not null,
  response_text text not null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz
);

-- Log of AI warnings issued (e.g. quarterly unfinished-task warnings)
create table ai_warnings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  team_id      uuid references teams(id) on delete cascade,
  quarter      text not null, -- e.g. '2026-Q3'
  message      text not null,
  created_at   timestamptz not null default now()
);

-- AI guardrail log — records suggested vs final value when leader
-- overrides an AI suggestion, for later accuracy evaluation
create table ai_suggestion_overrides (
  id                 uuid primary key default gen_random_uuid(),
  task_id            uuid not null references tasks(id) on delete cascade,
  suggested_priority text references priority_levels(level),
  suggested_duration_hours numeric,
  final_priority     text references priority_levels(level),
  final_duration_hours numeric,
  overridden_by      uuid references profiles(id),
  created_at         timestamptz not null default now()
);

-- =====================================================================
-- Notes / next steps:
-- 1. Row Level Security (RLS) — since Supabase Auth is used, add RLS
--    policies keyed on auth.uid() = profiles.id, scoping reads/writes
--    by team_id and role ('leader' can create milestones/projects/tasks
--    tied to CS complaints and manage invitations/dependencies/archiving;
--    'member' can only update own tasks' status, comments, attachments).
-- 2. Workload % is computed on the fly:
--      sum(priority_levels.weight) for a user's open tasks
--      / capacity_settings.baseline_points  -> flag if > 0.8
--    No snapshot table yet — add one later only if historical trend
--    charts need point-in-time data the live query can't reconstruct.
-- 3. github_integrations.access_token must be encrypted at rest
--    (e.g. Supabase Vault / pgsodium) — never return it through any API.
-- 4. task_dependencies enforcement (hard block vs soft warning on
--    moving to "Done") is an open product decision — see PRD §19.
-- =====================================================================