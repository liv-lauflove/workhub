-- =====================================================================
-- Migration: Task Attachments Object Authorization & RLS Hardening
-- Issue #147: fix(tasks): terapkan otorisasi objek pada seluruh operasi lampiran
-- Audit Reference: S03 (High Priority)
-- =====================================================================

-- 1. Helper Function: Check whether current user can view task attachments
create or replace function public.can_view_task_attachment(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    left join public.projects p on p.id = t.project_id
    cross join public.profiles viewer
    where t.id = target_task_id
      and viewer.id = (select auth.uid())
      and (
        t.project_id is null
        or p.team_id is null
        or viewer.id in (t.assignee_id, t.developer_id, t.tester_id)
        or viewer.team_id = p.team_id
        or exists (
          select 1
          from public.teams tm
          where tm.id = viewer.team_id
            and tm.name = 'Management'
        )
      )
  );
$$;

-- 2. Helper Function: Check whether current user can upload/insert attachments to a task
create or replace function public.can_upload_task_attachment(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    left join public.projects p on p.id = t.project_id
    cross join public.profiles uploader
    where t.id = target_task_id
      and uploader.id = (select auth.uid())
      and (
        p.team_id is null
        or uploader.team_id = p.team_id
        or uploader.id in (t.assignee_id, t.developer_id, t.tester_id)
        or exists (
          select 1
          from public.teams tm
          where tm.id = uploader.team_id
            and tm.name = 'Management'
        )
      )
  );
$$;

-- 3. Helper Function: Check whether current user can delete a task attachment
create or replace function public.can_delete_task_attachment(target_attachment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_attachments ta
    join public.tasks t on t.id = ta.task_id
    left join public.projects p on p.id = t.project_id
    cross join public.profiles actor
    where ta.id = target_attachment_id
      and actor.id = (select auth.uid())
      and (
        ta.uploaded_by = actor.id
        or exists (
          select 1
          from public.teams tm
          where tm.id = actor.team_id
            and tm.name = 'Management'
        )
        or (
          actor.role = 'leader'
          and (p.team_id is null or actor.team_id = p.team_id)
        )
      )
  );
$$;

-- 4. Database Trigger: Enforce object invariants, path isolation, and immutability
create or replace function public.before_task_attachment_write_guards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  task_rec record;
  actor_prof record;
  expected_prefix text;
begin
  -- Bypass when running without authenticated user session (e.g. system seed scripts / migrations)
  if actor_id is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    -- Verify target task exists
    select t.id, t.project_id, t.assignee_id, t.developer_id, t.tester_id, p.team_id
    into task_rec
    from public.tasks t
    left join public.projects p on p.id = t.project_id
    where t.id = new.task_id;

    if not found then
      raise exception 'Task tidak ditemukan untuk lampiran ini.'
        using errcode = '42501';
    end if;

    -- Verify actor profile and squad membership
    select pr.id, pr.role, pr.team_id, tm.name as team_name
    into actor_prof
    from public.profiles pr
    left join public.teams tm on tm.id = pr.team_id
    where pr.id = actor_id;

    if not (
      actor_prof.team_name = 'Management'
      or task_rec.team_id is null
      or actor_prof.team_id = task_rec.team_id
      or actor_id in (task_rec.assignee_id, task_rec.developer_id, task_rec.tester_id)
    ) then
      raise exception 'Anda tidak memiliki izin untuk mengunggah lampiran pada task ini.'
        using errcode = '42501';
    end if;

    -- Verify uploaded_by strictly matches authenticated user
    if new.uploaded_by is distinct from actor_id then
      raise exception 'Kolom uploaded_by harus sesuai dengan pengguna yang sedang login.'
        using errcode = '42501';
    end if;

    -- Verify maximum file size (5MB = 5242880 bytes)
    if new.file_size is not null and new.file_size > 5242880 then
      raise exception 'Ukuran berkas lampiran melebihi batas maksimum 5 MB.'
        using errcode = '22023';
    end if;

    -- Verify storage path follows tasks/<task_id>/ prefix
    expected_prefix := 'tasks/' || new.task_id::text || '/';
    if new.file_url not like expected_prefix || '%' then
      raise exception 'Path berkas lampiran tidak sesuai dengan ID task tujuan.'
        using errcode = '22023';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- Task attachments are immutable metadata. Task binding, storage path, and uploader cannot change.
    if new.task_id is distinct from old.task_id
       or new.file_url is distinct from old.file_url
       or new.uploaded_by is distinct from old.uploaded_by then
      raise exception 'Metadata lampiran task tidak dapat diubah setelah dicatat.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    select t.id, t.project_id, p.team_id
    into task_rec
    from public.tasks t
    left join public.projects p on p.id = t.project_id
    where t.id = old.task_id;

    select pr.id, pr.role, pr.team_id, tm.name as team_name
    into actor_prof
    from public.profiles pr
    left join public.teams tm on tm.id = pr.team_id
    where pr.id = actor_id;

    if not (
      old.uploaded_by = actor_id
      or actor_prof.team_name = 'Management'
      or (actor_prof.role = 'leader' and (task_rec.team_id is null or actor_prof.team_id = task_rec.team_id))
    ) then
      raise exception 'Anda tidak memiliki izin untuk menghapus lampiran ini.'
        using errcode = '42501';
    end if;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_task_attachments_write_guards on public.task_attachments;
create trigger trg_task_attachments_write_guards
  before insert or update or delete on public.task_attachments
  for each row execute function public.before_task_attachment_write_guards();

-- 5. Hardened Row Level Security (RLS) on public.task_attachments
alter table public.task_attachments enable row level security;

drop policy if exists "task_attachments_select_authenticated" on public.task_attachments;
drop policy if exists "task_attachments_select_authorized" on public.task_attachments;
create policy "task_attachments_select_authorized"
  on public.task_attachments for select
  to authenticated
  using (public.can_view_task_attachment(task_id));

drop policy if exists "task_attachments_insert_own" on public.task_attachments;
drop policy if exists "task_attachments_insert_authorized" on public.task_attachments;
create policy "task_attachments_insert_authorized"
  on public.task_attachments for insert
  to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and public.can_upload_task_attachment(task_id)
  );

drop policy if exists "task_attachments_update_authorized" on public.task_attachments;
create policy "task_attachments_update_authorized"
  on public.task_attachments for update
  to authenticated
  using (public.can_view_task_attachment(task_id));

drop policy if exists "task_attachments_delete_own_or_leader" on public.task_attachments;
drop policy if exists "task_attachments_delete_authorized" on public.task_attachments;
create policy "task_attachments_delete_authorized"
  on public.task_attachments for delete
  to authenticated
  using (true);

-- 6. Storage Policies on storage.objects for bucket 'attachments'
drop policy if exists "attachments_read_authenticated" on storage.objects;
drop policy if exists "attachments_read_authorized" on storage.objects;
create policy "attachments_read_authorized"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and (
      (select auth.uid()) = owner
      or exists (
        select 1 from public.task_attachments ta
        where ta.file_url = storage.objects.name
          and public.can_view_task_attachment(ta.task_id)
      )
    )
  );

drop policy if exists "attachments_delete_owner_or_leader" on storage.objects;
drop policy if exists "attachments_delete_authorized" on storage.objects;
create policy "attachments_delete_authorized"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and (
      (select auth.uid()) = owner
      or exists (
        select 1 from public.task_attachments ta
        where ta.file_url = storage.objects.name
          and public.can_delete_task_attachment(ta.id)
      )
    )
  );
