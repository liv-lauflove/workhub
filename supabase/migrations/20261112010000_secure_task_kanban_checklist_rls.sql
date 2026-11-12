-- =====================================================================
-- Migration: Restrict Task, Kanban Board Column, and Subtask Checklist
--            Mutations to Authorized Roles and Task Owners
-- Issue #146 (Audit S02): Batasi mutasi task, Kanban, dan checklist
--                         sesuai matriks hak akses PRD
-- =====================================================================

-- 1. Revoke broad table and column privileges before granting explicit rights
revoke all privileges on table public.board_columns from public, anon, authenticated;
revoke all privileges
  (id, project_id, name, position, is_default)
  on table public.board_columns from public, anon, authenticated;

revoke all privileges on table public.tasks from public, anon, authenticated;
revoke all privileges
  (id, project_id, column_id, title, description, assignee_id,
   priority, origin, origin_note, github_branch, github_repo,
   due_date, created_by, created_at, updated_at, purpose,
   developer_id, tester_id, dev_status, test_status, test_notes, base_points)
  on table public.tasks from public, anon, authenticated;

revoke all privileges on table public.task_subtasks from public, anon, authenticated;
revoke all privileges
  (id, task_id, title, is_completed, tested_by, tested_at, sort_order, created_at)
  on table public.task_subtasks from public, anon, authenticated;

grant select, insert, delete on table public.board_columns to authenticated;
grant update (name, position, is_default) on table public.board_columns to authenticated;

grant select, insert, delete on table public.tasks to authenticated;
grant update
  (column_id, title, description, assignee_id, developer_id, tester_id,
   purpose, dev_status, test_status, test_notes, priority, base_points,
   origin, origin_note, github_branch, github_repo, due_date, updated_at)
  on table public.tasks to authenticated;

grant select, insert, delete on table public.task_subtasks to authenticated;
grant update
  (title, is_completed, tested_by, tested_at, sort_order)
  on table public.task_subtasks to authenticated;

-- 2. Authorization helper functions (SECURITY DEFINER with empty search_path)
create or replace function public.is_project_leader(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    p_project_id is not null
    and auth.uid() is not null
    and exists (
      select 1
      from public.profiles actor
      join public.projects proj on proj.id = p_project_id
      where actor.id = auth.uid()
        and actor.role = 'leader'
        and (
          actor.team_id = proj.team_id
          or actor.team_id = 'e3333333-3333-3333-3333-333333333333'::uuid
        )
    ),
    false
  );
$$;

create or replace function public.can_access_task_checklist(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    p_task_id is not null
    and auth.uid() is not null
    and exists (
      select 1
      from public.tasks t
      where t.id = p_task_id
        and t.project_id is not null
        and (
          public.is_project_leader(t.project_id)
          or auth.uid() in (t.assignee_id, t.developer_id, t.tester_id)
        )
    ),
    false
  );
$$;

create or replace function public.can_verify_task_checklist(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    p_task_id is not null
    and auth.uid() is not null
    and exists (
      select 1
      from public.tasks t
      where t.id = p_task_id
        and t.project_id is not null
        and (
          public.is_project_leader(t.project_id)
          or t.tester_id = auth.uid()
        )
    ),
    false
  );
$$;

revoke execute on function public.is_project_leader(uuid) from public, anon;
revoke execute on function public.can_access_task_checklist(uuid) from public, anon;
revoke execute on function public.can_verify_task_checklist(uuid) from public, anon;

grant execute on function public.is_project_leader(uuid) to authenticated, service_role;
grant execute on function public.can_access_task_checklist(uuid) to authenticated, service_role;
grant execute on function public.can_verify_task_checklist(uuid) to authenticated, service_role;

-- 3. Replace permissive policies on board_columns
drop policy if exists board_columns_insert_authenticated on public.board_columns;
drop policy if exists board_columns_update_authenticated on public.board_columns;
drop policy if exists board_columns_delete_authenticated on public.board_columns;
drop policy if exists board_columns_insert_leader on public.board_columns;
drop policy if exists board_columns_update_leader on public.board_columns;
drop policy if exists board_columns_delete_leader on public.board_columns;

create policy board_columns_insert_leader
  on public.board_columns for insert
  to authenticated
  with check (public.is_project_leader(project_id));

create policy board_columns_update_leader
  on public.board_columns for update
  to authenticated
  using (public.is_project_leader(project_id))
  with check (public.is_project_leader(project_id));

create policy board_columns_delete_leader
  on public.board_columns for delete
  to authenticated
  using (public.is_project_leader(project_id));

-- 4. Replace permissive policies on tasks
drop policy if exists tasks_insert_authenticated on public.tasks;
drop policy if exists tasks_update_authenticated on public.tasks;
drop policy if exists tasks_insert_leader on public.tasks;
drop policy if exists tasks_update_authorized on public.tasks;
drop policy if exists tasks_delete_leader on public.tasks;

create policy tasks_insert_leader
  on public.tasks for insert
  to authenticated
  with check (
    project_id is not null
    and created_by = (select auth.uid())
    and public.is_project_leader(project_id)
    and exists (
      select 1
      from public.board_columns bc
      where bc.id = column_id
        and bc.project_id = tasks.project_id
    )
  );

create policy tasks_update_authorized
  on public.tasks for update
  to authenticated
  using (
    project_id is not null
    and (
      public.is_project_leader(project_id)
      or (select auth.uid()) in (assignee_id, developer_id, tester_id)
    )
  )
  with check (
    project_id is not null
    and exists (
      select 1
      from public.board_columns bc
      where bc.id = column_id
        and bc.project_id = tasks.project_id
    )
  );

create policy tasks_delete_leader
  on public.tasks for delete
  to authenticated
  using (
    project_id is not null
    and public.is_project_leader(project_id)
  );

-- 5. Replace permissive policies on task_subtasks
drop policy if exists task_subtasks_insert_authenticated on public.task_subtasks;
drop policy if exists task_subtasks_update_authenticated on public.task_subtasks;
drop policy if exists task_subtasks_delete_authenticated on public.task_subtasks;
drop policy if exists task_subtasks_insert_authorized on public.task_subtasks;
drop policy if exists task_subtasks_update_authorized on public.task_subtasks;
drop policy if exists task_subtasks_delete_authorized on public.task_subtasks;

create policy task_subtasks_insert_authorized
  on public.task_subtasks for insert
  to authenticated
  with check (
    public.can_access_task_checklist(task_id)
    and (
      (is_completed = false and tested_by is null and tested_at is null)
      or (
        is_completed = true
        and public.can_verify_task_checklist(task_id)
        and tested_by = (select auth.uid())
        and tested_at is not null
      )
    )
  );

create policy task_subtasks_update_authorized
  on public.task_subtasks for update
  to authenticated
  using (public.can_verify_task_checklist(task_id))
  with check (
    public.can_verify_task_checklist(task_id)
    and (
      (is_completed = false and tested_by is null and tested_at is null)
      or (
        is_completed = true
        and tested_by = (select auth.uid())
        and tested_at is not null
      )
    )
  );

create policy task_subtasks_delete_authorized
  on public.task_subtasks for delete
  to authenticated
  using (
    public.can_verify_task_checklist(task_id)
    or (
      public.can_access_task_checklist(task_id)
      and is_completed = false
    )
  );

-- 6. Trigger to enforce task column/project invariant and field-level role transitions
create or replace function public.enforce_task_write_guards()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_col public.board_columns%rowtype;
  project_team_id uuid;
  is_leader boolean := false;
  is_dev boolean := false;
  is_qa boolean := false;
  is_done_column boolean := false;
begin
  if new.project_id is null or new.column_id is null then
    raise exception 'Task wajib memiliki project dan kolom Kanban yang valid.'
      using errcode = '23514';
  end if;

  select team_id into project_team_id
  from public.projects
  where id = new.project_id;

  if not found then
    raise exception 'Project task tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  select * into target_col
  from public.board_columns
  where id = new.column_id
    and project_id = new.project_id;

  if not found then
    raise exception 'Kolom Kanban tidak sesuai dengan project task.'
      using errcode = '23514';
  end if;

  is_done_column := coalesce(
    lower(target_col.name) like '%done%'
    or lower(target_col.name) like '%selesai%'
    or lower(target_col.name) like '%complete%',
    false
  );

  -- Validate newly assigned users belong to the project team or Management team
  if new.assignee_id is not null and (
    tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id
  ) then
    if not exists (
      select 1 from public.profiles p
      where p.id = new.assignee_id
        and p.team_id in (project_team_id, 'e3333333-3333-3333-3333-333333333333'::uuid)
    ) then
      raise exception 'Assignee tidak termasuk dalam tim project ini.'
        using errcode = '23514';
    end if;
  end if;

  if new.developer_id is not null and (
    tg_op = 'INSERT' or new.developer_id is distinct from old.developer_id
  ) then
    if not exists (
      select 1 from public.profiles p
      where p.id = new.developer_id
        and p.team_id in (project_team_id, 'e3333333-3333-3333-3333-333333333333'::uuid)
    ) then
      raise exception 'Developer tidak termasuk dalam tim project ini.'
        using errcode = '23514';
    end if;
  end if;

  if new.tester_id is not null and (
    tg_op = 'INSERT' or new.tester_id is distinct from old.tester_id
  ) then
    if not exists (
      select 1 from public.profiles p
      where p.id = new.tester_id
        and p.team_id in (project_team_id, 'e3333333-3333-3333-3333-333333333333'::uuid)
    ) then
      raise exception 'Tester QA tidak termasuk dalam tim project ini.'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if actor_id is not null then
      if not coalesce(public.is_project_leader(new.project_id), false) or new.created_by is distinct from actor_id then
        raise exception 'Hanya leader project yang dapat membuat task baru.'
          using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE guards
  if new.id is distinct from old.id
    or new.project_id is distinct from old.project_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Identitas project atau pembuat task tidak dapat diubah.'
      using errcode = '42501';
  end if;

  if new.test_status = 'passed' and exists (
    select 1
    from public.task_subtasks st
    where st.task_id = new.id
      and st.is_completed is distinct from true
  ) then
    raise exception 'Seluruh checklist subtask pengujian wajib diselesaikan sebelum task dinyatakan Passed QA.'
      using errcode = '23514';
  end if;

  if actor_id is not null then
    is_leader := coalesce(public.is_project_leader(old.project_id), false);
    is_dev := coalesce(actor_id = old.developer_id, false) or coalesce(actor_id = old.assignee_id, false);
    is_qa := coalesce(actor_id = old.tester_id, false);

    if not is_leader and not is_dev and not is_qa then
      raise exception 'Anda tidak memiliki hak akses untuk mengubah task ini.'
        using errcode = '42501';
    end if;

    if not is_leader then
      if new.assignee_id is distinct from old.assignee_id
        or new.developer_id is distinct from old.developer_id
        or new.priority is distinct from old.priority
        or new.base_points is distinct from old.base_points
        or new.origin is distinct from old.origin
        or new.origin_note is distinct from old.origin_note
        or new.due_date is distinct from old.due_date
        or new.purpose is distinct from old.purpose then
        raise exception 'Hanya leader yang dapat mengubah penugasan utama atau metadata prioritas task.'
          using errcode = '42501';
      end if;

      if new.tester_id is distinct from old.tester_id then
        if not (
          is_dev
          and old.tester_id is null
          and new.tester_id is not null
          and new.tester_id is distinct from actor_id
          and new.dev_status = 'dev_done'
          and new.test_status = 'testing'
        ) then
          raise exception 'Anda tidak berwenang mengubah reviewer QA pada task ini.'
            using errcode = '42501';
        end if;
      end if;

      if not is_dev then
        if new.title is distinct from old.title
          or new.description is distinct from old.description
          or new.github_branch is distinct from old.github_branch
          or new.github_repo is distinct from old.github_repo then
          raise exception 'Tester hanya dapat memperbarui status dan catatan pengujian QA.'
            using errcode = '42501';
        end if;

        if new.dev_status is distinct from old.dev_status then
          if not (
            (new.test_status = 'failed' and new.dev_status = 'in_progress')
            or (new.test_status = 'passed' and new.dev_status = 'dev_done')
          ) then
            raise exception 'Perubahan status development oleh tester tidak valid.'
              using errcode = '42501';
          end if;
        end if;
      end if;

      if not is_qa then
        if new.test_status is distinct from old.test_status then
          if not (new.dev_status = 'dev_done' and new.test_status = 'testing') then
            raise exception 'Hanya reviewer QA atau leader yang dapat menetapkan hasil kelulusan pengujian.'
              using errcode = '42501';
          end if;
        end if;

        if is_done_column and old.test_status is distinct from 'passed' then
          raise exception 'Task harus lulus pengujian QA sebelum dipindahkan ke kolom Done.'
            using errcode = '42501';
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists before_task_write_guards on public.tasks;
create trigger before_task_write_guards
  before insert or update on public.tasks
  for each row
  execute function public.enforce_task_write_guards();

notify pgrst, 'reload schema';
