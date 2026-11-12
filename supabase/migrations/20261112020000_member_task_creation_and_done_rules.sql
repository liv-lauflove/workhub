-- =====================================================================
-- Migration: Allow Team Members to Create Tasks & Enforce Done Column Guards
-- Issue #165: Izinkan member tim membuat task dan perketat aturan kolom Done
-- =====================================================================

-- 1. Helper function: check if authenticated user belongs to project's team or Management
create or replace function public.can_create_project_task(p_project_id uuid)
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
        and (
          actor.team_id = proj.team_id
          or actor.team_id = 'e3333333-3333-3333-3333-333333333333'::uuid
        )
    ),
    false
  );
$$;

revoke execute on function public.can_create_project_task(uuid) from public, anon;
grant execute on function public.can_create_project_task(uuid) to authenticated, service_role;

-- 2. Update tasks INSERT policy: allow project team members and Management
drop policy if exists tasks_insert_leader on public.tasks;
drop policy if exists tasks_insert_authorized on public.tasks;

create policy tasks_insert_authorized
  on public.tasks for insert
  to authenticated
  with check (
    project_id is not null
    and created_by = (select auth.uid())
    and public.can_create_project_task(project_id)
    and exists (
      select 1
      from public.board_columns bc
      where bc.id = column_id
        and bc.project_id = tasks.project_id
    )
  );

-- 3. Replace enforce_task_write_guards trigger function
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

  -- INSERT: allow members belonging to the project team or Management
  if tg_op = 'INSERT' then
    if actor_id is not null then
      if not coalesce(public.can_create_project_task(new.project_id), false)
        or new.created_by is distinct from actor_id then
        raise exception 'Hanya anggota tim project terkait atau Tim Management yang dapat membuat task baru.'
          using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE guards: protect immutable identity fields
  if new.id is distinct from old.id
    or new.project_id is distinct from old.project_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Identitas project atau pembuat task tidak dapat diubah.'
      using errcode = '42501';
  end if;

  -- Done column rule: development must be dev_done AND QA review must be passed
  if is_done_column then
    if coalesce(new.dev_status, old.dev_status) is distinct from 'dev_done'
      or coalesce(new.test_status, old.test_status) is distinct from 'passed' then
      raise exception 'Task harus menyelesaikan tahap development dan lulus review pengujian QA sebelum dipindahkan ke kolom Done.'
        using errcode = '23514';
    end if;

    if exists (
      select 1
      from public.task_subtasks st
      where st.task_id = new.id
        and st.is_completed is distinct from true
    ) then
      raise exception 'Seluruh checklist subtask pengujian wajib diselesaikan sebelum task dinyatakan Passed QA atau dipindahkan ke kolom Done.'
        using errcode = '23514';
    end if;
  end if;

  -- Setting test_status = 'passed' in any column also requires all subtasks to be completed
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
      raise exception 'Anda hanya dapat mengubah atau menggeser task yang ditugaskan ke diri Anda sendiri.'
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
      end if;
    end if;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
