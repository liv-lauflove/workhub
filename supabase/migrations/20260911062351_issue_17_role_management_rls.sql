-- =====================================================================
-- Migration: Row Level Security for Role Management
-- Issue #17: [Team] Manajemen Role (Leader/Member)
-- =====================================================================

-- Allow leaders to update the profile (specifically for changing role) 
-- of members who belong to the same team.
create policy "profiles_update_leader"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles as leader_profile
      where leader_profile.id = (select auth.uid())
        and leader_profile.role = 'leader'
        and leader_profile.team_id = profiles.team_id
    )
  )
  with check (
    -- Prevent moving members to a different team maliciously
    exists (
      select 1
      from public.profiles as leader_profile
      where leader_profile.id = (select auth.uid())
        and leader_profile.role = 'leader'
        and leader_profile.team_id = profiles.team_id
    )
  );
