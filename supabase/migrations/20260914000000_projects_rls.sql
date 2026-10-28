-- =====================================================================
-- Migration: Row Level Security for projects table
-- Issue #20: [Project] Form Pembuatan Project
-- =====================================================================

alter table public.projects enable row level security;

-- 1. SELECT — all authenticated users can view active projects
-- (needed for milestone details, project list, task board, and dashboards)
create policy "projects_select_authenticated"
  on public.projects for select
  to authenticated
  using (true);

-- 2. INSERT — only team leaders can create projects
create policy "projects_insert_leader"
  on public.projects for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'leader'
    )
  );

-- 3. UPDATE — only team leaders can update projects (including status and archiving)
create policy "projects_update_leader"
  on public.projects for update
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
