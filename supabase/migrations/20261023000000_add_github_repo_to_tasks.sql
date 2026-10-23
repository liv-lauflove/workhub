-- =====================================================================
-- Migration: Add github_repo to tasks for Multi-Repository Support
-- Issue #133: [GitHub] Dukungan Multi-Repository pada Task & Webhook Filtering
-- =====================================================================

-- 1. Add nullable github_repo column to tasks table
alter table public.tasks
  add column if not exists github_repo text;

-- 2. Create composite partial index for fast webhook branch + repository lookup
create index if not exists idx_tasks_github_branch_repo
  on public.tasks (github_branch, github_repo)
  where github_branch is not null;

-- 3. Update log_task_activity trigger function to also log github_repo changes
create or replace function public.log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null or not exists (select 1 from public.profiles where id = v_actor_id) then
    v_actor_id := coalesce(new.created_by, old.created_by);
  end if;

  if v_actor_id is null then
    return new;
  end if;

  if old.column_id is distinct from new.column_id then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'column_id', old.column_id::text, new.column_id::text);
  end if;

  if old.priority is distinct from new.priority then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'priority', old.priority::text, new.priority::text);
  end if;

  if old.assignee_id is distinct from new.assignee_id then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'assignee_id', old.assignee_id::text, new.assignee_id::text);
  end if;

  if old.due_date is distinct from new.due_date then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'due_date', old.due_date::text, new.due_date::text);
  end if;

  if old.title is distinct from new.title then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'title', old.title::text, new.title::text);
  end if;

  if old.description is distinct from new.description then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'description', old.description::text, new.description::text);
  end if;

  if old.project_id is distinct from new.project_id then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'project_id', old.project_id::text, new.project_id::text);
  end if;

  if old.github_branch is distinct from new.github_branch then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'github_branch', old.github_branch::text, new.github_branch::text);
  end if;

  if old.github_repo is distinct from new.github_repo then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'github_repo', old.github_repo::text, new.github_repo::text);
  end if;

  return new;
end;
$$;
