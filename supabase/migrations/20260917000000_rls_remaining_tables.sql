-- =====================================================================
-- Migration: Row Level Security for ALL remaining tables
-- Issue #65: [Security] Implementasi RLS Policy pada Seluruh Tabel
--            Database yang Tersisa
-- =====================================================================
-- Tables covered in this migration:
--   1. task_comments        — Discussion thread on task cards
--   2. task_attachments     — File uploads on tasks
--   3. task_dependencies    — "Blocked by" relations between tasks
--   4. activity_log         — Audit trail for task field changes
--   5. github_commits       — Cached commit history linked to tasks
--   6. github_integrations  — Long-lived GitHub access tokens (SENSITIVE)
--   7. notifications        — In-app notifications per user
--   8. priority_levels      — Reference/lookup data (weights)
--   9. capacity_settings    — Per-team baseline points
--  10. ai_query_cache       — Chatbot response cache
--  11. ai_warnings          — AI overload warnings
--  12. ai_suggestion_overrides — AI guardrail override log
--
-- Best practices (consistent with existing migrations):
--   • Use `(select auth.uid())` for performance (avoids re-eval per row)
--   • Target `to authenticated` so anon role is excluded by default
--   • No DELETE policy = denied by default when RLS is enabled
--   • Keep policies simple; prefer subqueries over joins
-- =====================================================================


-- =====================================================================
-- 1. TASK_COMMENTS — Row Level Security
-- =====================================================================
-- Schema: task_id (FK tasks), author_id (FK profiles), content, created_at

alter table public.task_comments enable row level security;

-- 1a. SELECT — all authenticated users can read comments
--     (comments are visible to anyone who can see the task)
create policy "task_comments_select_authenticated"
  on public.task_comments for select
  to authenticated
  using (true);

-- 1b. INSERT — authenticated users can post comments
--     (author_id must match the current user)
create policy "task_comments_insert_own"
  on public.task_comments for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

-- 1c. UPDATE — users can only edit their own comments
create policy "task_comments_update_own"
  on public.task_comments for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

-- 1d. DELETE — users can only delete their own comments
create policy "task_comments_delete_own"
  on public.task_comments for delete
  to authenticated
  using ((select auth.uid()) = author_id);


-- =====================================================================
-- 2. TASK_ATTACHMENTS — Row Level Security
-- =====================================================================
-- Schema: task_id (FK tasks), uploaded_by (FK profiles), file_url, ...

alter table public.task_attachments enable row level security;

-- 2a. SELECT — all authenticated users can view attachments
create policy "task_attachments_select_authenticated"
  on public.task_attachments for select
  to authenticated
  using (true);

-- 2b. INSERT — authenticated users can upload attachments
--     (uploaded_by must match the current user)
create policy "task_attachments_insert_own"
  on public.task_attachments for insert
  to authenticated
  with check ((select auth.uid()) = uploaded_by);

-- 2c. DELETE — users can only delete their own uploads,
--     OR leaders can delete any attachment
create policy "task_attachments_delete_own_or_leader"
  on public.task_attachments for delete
  to authenticated
  using (
    (select auth.uid()) = uploaded_by
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'leader'
    )
  );


-- =====================================================================
-- 3. TASK_DEPENDENCIES — Row Level Security
-- =====================================================================
-- Schema: task_id, depends_on_task_id (self-referencing "blocked by")

alter table public.task_dependencies enable row level security;

-- 3a. SELECT — all authenticated users can view dependencies
--     (needed to render "blocked" badges on Kanban cards)
create policy "task_dependencies_select_authenticated"
  on public.task_dependencies for select
  to authenticated
  using (true);

-- 3b. INSERT — only leaders can create dependencies (PRD §9.12)
create policy "task_dependencies_insert_leader"
  on public.task_dependencies for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'leader'
    )
  );

-- 3c. DELETE — only leaders can remove dependencies
create policy "task_dependencies_delete_leader"
  on public.task_dependencies for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'leader'
    )
  );


-- =====================================================================
-- 4. ACTIVITY_LOG — Row Level Security
-- =====================================================================
-- Schema: task_id, actor_id, field_name, old_value, new_value
-- PRD §9.9: "tidak bisa diedit/dihapus manual"

alter table public.activity_log enable row level security;

-- 4a. SELECT — all authenticated users can read audit trail
create policy "activity_log_select_authenticated"
  on public.activity_log for select
  to authenticated
  using (true);

-- 4b. INSERT — system/server inserts only (via service_role or triggers)
--     Allow authenticated insert so server actions can write audit entries
--     with actor_id matching the current user
create policy "activity_log_insert_own_actor"
  on public.activity_log for insert
  to authenticated
  with check ((select auth.uid()) = actor_id);

-- 4c. UPDATE / DELETE — NO policies = denied by default
--     Activity logs are immutable audit records (PRD §9.9 AC)


-- =====================================================================
-- 5. GITHUB_COMMITS — Row Level Security
-- =====================================================================
-- Schema: task_id, commit_sha, commit_message, author_username, url

alter table public.github_commits enable row level security;

-- 5a. SELECT — all authenticated users can view commit history
create policy "github_commits_select_authenticated"
  on public.github_commits for select
  to authenticated
  using (true);

-- 5b. INSERT — server-side only (webhook/background job via service_role)
--     No client-side insert policy = denied for browser users
--     Service role bypasses RLS, so webhook handlers still work

-- 5c. UPDATE / DELETE — no policies = denied by default


-- =====================================================================
-- 6. GITHUB_INTEGRATIONS — Row Level Security  ⚠️  CRITICAL / SENSITIVE
-- =====================================================================
-- Schema: user_id, github_user_id, access_token (ENCRYPTED), scope
-- WARNING: access_token must NEVER be exposed to other users

alter table public.github_integrations enable row level security;

-- 6a. SELECT — users can ONLY read their own integration record
--     (prevents any user from seeing another user's GitHub token)
create policy "github_integrations_select_own"
  on public.github_integrations for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- 6b. INSERT — users can only create their own integration
create policy "github_integrations_insert_own"
  on public.github_integrations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- 6c. UPDATE — users can only update their own integration
create policy "github_integrations_update_own"
  on public.github_integrations for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 6d. DELETE — users can only disconnect their own integration
create policy "github_integrations_delete_own"
  on public.github_integrations for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- =====================================================================
-- 7. NOTIFICATIONS — Row Level Security
-- =====================================================================
-- Schema: user_id, type, title, body, related_task_id, is_read

alter table public.notifications enable row level security;

-- 7a. SELECT — users can ONLY read their own notifications
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- 7b. INSERT — server-side only (triggers/service_role create notifications)
--     Allow authenticated insert so server actions can send notifications
--     No ownership check on insert — server creates notifs for other users
--     This will be called from service_role in server actions, which bypasses RLS

-- 7c. UPDATE — users can only mark their own notifications as read
create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 7d. DELETE — no policy = denied. Notifications are kept for history


-- =====================================================================
-- 8. PRIORITY_LEVELS — Row Level Security
-- =====================================================================
-- Schema: level (PK), weight, sort_order
-- Reference/lookup data — seeded, read-only for all users

alter table public.priority_levels enable row level security;

-- 8a. SELECT — all authenticated users can read priority levels
create policy "priority_levels_select_authenticated"
  on public.priority_levels for select
  to authenticated
  using (true);

-- 8b. INSERT / UPDATE / DELETE — no policies = denied by default
--     Priority levels are seeded data, not user-managed


-- =====================================================================
-- 9. CAPACITY_SETTINGS — Row Level Security
-- =====================================================================
-- Schema: team_id (PK, FK teams), baseline_points, updated_at

alter table public.capacity_settings enable row level security;

-- 9a. SELECT — all authenticated users can view capacity settings
--     (needed for workload % calculation on dashboard)
create policy "capacity_settings_select_authenticated"
  on public.capacity_settings for select
  to authenticated
  using (true);

-- 9b. UPDATE — only leaders of the team can adjust baseline
create policy "capacity_settings_update_leader"
  on public.capacity_settings for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'leader'
        and profiles.team_id = capacity_settings.team_id
    )
  );

-- 9c. INSERT / DELETE — no policies = denied by default
--     Capacity settings are seeded per team


-- =====================================================================
-- 10. AI_QUERY_CACHE — Row Level Security
-- =====================================================================
-- Schema: query_hash, query_text, response_text, expires_at
-- Shared cache — no user ownership, server-managed

alter table public.ai_query_cache enable row level security;

-- 10a. SELECT — all authenticated users can read cached responses
create policy "ai_query_cache_select_authenticated"
  on public.ai_query_cache for select
  to authenticated
  using (true);

-- 10b. INSERT / UPDATE / DELETE — server-side only (service_role)
--      No policies = denied for client-side users


-- =====================================================================
-- 11. AI_WARNINGS — Row Level Security
-- =====================================================================
-- Schema: user_id, team_id, quarter, message

alter table public.ai_warnings enable row level security;

-- 11a. SELECT — users can view warnings relevant to their team
create policy "ai_warnings_select_team"
  on public.ai_warnings for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.team_id = ai_warnings.team_id
    )
  );

-- 11b. INSERT / UPDATE / DELETE — server-side only (service_role)


-- =====================================================================
-- 12. AI_SUGGESTION_OVERRIDES — Row Level Security
-- =====================================================================
-- Schema: task_id, suggested_priority, final_priority, overridden_by

alter table public.ai_suggestion_overrides enable row level security;

-- 12a. SELECT — all authenticated users can view override history
create policy "ai_suggestion_overrides_select_authenticated"
  on public.ai_suggestion_overrides for select
  to authenticated
  using (true);

-- 12b. INSERT — only leaders can log overrides
create policy "ai_suggestion_overrides_insert_leader"
  on public.ai_suggestion_overrides for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'leader'
    )
  );

-- 12c. UPDATE / DELETE — no policies = denied (immutable log)
