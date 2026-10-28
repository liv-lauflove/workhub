-- =====================================================================
-- Migration: Row Level Security for board_columns and tasks tables
-- Issue #22: [Kanban] UI Kolom Kanban Custom
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BOARD_COLUMNS — Row Level Security
-- ---------------------------------------------------------------------
alter table public.board_columns enable row level security;

-- 1a. SELECT — all authenticated users can view board columns
create policy "board_columns_select_authenticated"
  on public.board_columns for select
  to authenticated
  using (true);

-- 1b. INSERT — leaders and authenticated members can create board columns
create policy "board_columns_insert_authenticated"
  on public.board_columns for insert
  to authenticated
  with check (true);

-- 1c. UPDATE — leaders and authenticated members can update columns
create policy "board_columns_update_authenticated"
  on public.board_columns for update
  to authenticated
  using (true)
  with check (true);

-- 1d. DELETE — authenticated users can delete columns
create policy "board_columns_delete_authenticated"
  on public.board_columns for delete
  to authenticated
  using (true);


-- ---------------------------------------------------------------------
-- 2. TASKS — Row Level Security
-- ---------------------------------------------------------------------
alter table public.tasks enable row level security;

-- 2a. SELECT — all authenticated users can view tasks
create policy "tasks_select_authenticated"
  on public.tasks for select
  to authenticated
  using (true);

-- 2b. INSERT — authenticated users can insert tasks
create policy "tasks_insert_authenticated"
  on public.tasks for insert
  to authenticated
  with check (true);

-- 2c. UPDATE — authenticated users can update tasks (e.g. status, column, position)
create policy "tasks_update_authenticated"
  on public.tasks for update
  to authenticated
  using (true)
  with check (true);
