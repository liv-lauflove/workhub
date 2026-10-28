-- =====================================================================
-- Migration: Row Level Security for milestones table
-- Issue #18: [Milestone] Form Pembuatan Milestone
-- =====================================================================

alter table public.milestones enable row level security;

-- 1. SELECT — all authenticated users can view milestones
-- (needed for milestone lists, dashboards, and project creation dropdowns)
create policy "milestones_select_authenticated"
  on public.milestones for select
  to authenticated
  using (true);

-- 2. INSERT — only team leaders can create milestones
create policy "milestones_insert_leader"
  on public.milestones for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'leader'
    )
  );

-- 3. UPDATE — only team leaders can update milestones (including archiving)
create policy "milestones_update_leader"
  on public.milestones for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'leader'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'leader'
    )
  );
