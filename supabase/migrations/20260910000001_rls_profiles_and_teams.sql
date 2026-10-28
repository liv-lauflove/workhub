-- =====================================================================
-- Migration: Row Level Security for profiles & teams
-- Issue #15: [Auth] RLS Policy untuk Tabel Profiles & Teams
-- =====================================================================
-- Best practices applied (from Supabase docs):
--   • Use `(select auth.uid())` instead of bare `auth.uid()` for
--     performance (avoids re-evaluation per row).
--   • Keep policies simple; avoid joins inside policies.
--   • Add `to authenticated` role target so anon is excluded.
-- =====================================================================


-- =====================================================================
-- 1. PROFILES — Row Level Security
-- =====================================================================

alter table public.profiles enable row level security;

-- 1a. SELECT — authenticated users can read ALL profiles
--     (needed for team roster, assignee picker, sidebar display, etc.)
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- 1b. INSERT — users can only insert their own profile row
--     (trigger handles this automatically, but safety net for edge cases)
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- 1c. UPDATE — users can only update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 1d. DELETE — no one can delete profiles via client
--     (cascade from auth.users handles deletion at DB level)
--     No policy = denied by default when RLS is enabled.


-- =====================================================================
-- 2. TEAMS — Row Level Security
-- =====================================================================

alter table public.teams enable row level security;

-- 2a. SELECT — all authenticated users can view teams
--     (team names are displayed in sidebar, dashboard, etc.)
create policy "teams_select_authenticated"
  on public.teams for select
  to authenticated
  using (true);

-- 2b. UPDATE — only a leader of the team can edit team metadata
--     Uses a subquery to check if the requesting user has role='leader'
--     and belongs to the target team.
create policy "teams_update_leader_only"
  on public.teams for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'leader'
        and profiles.team_id = teams.id
    )
  );

-- 2c. INSERT / DELETE — teams are seeded, not created/deleted by users.
--     No policy = denied by default when RLS is enabled.


-- =====================================================================
-- 3. TEAM_INVITATIONS — Row Level Security
-- =====================================================================

alter table public.team_invitations enable row level security;

-- 3a. SELECT — leaders can view all invitations for their team
create policy "team_invitations_select_leader"
  on public.team_invitations for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'leader'
        and profiles.team_id = team_invitations.team_id
    )
  );

-- 3b. INSERT — only leaders can create invitations for their team
create policy "team_invitations_insert_leader"
  on public.team_invitations for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'leader'
        and profiles.team_id = team_invitations.team_id
    )
  );
