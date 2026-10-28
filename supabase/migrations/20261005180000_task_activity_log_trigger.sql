-- =====================================================================
-- Migration: Automatic Task Activity Log Trigger
-- Issue #34: [Activity] Trigger DB Activity Log
-- =====================================================================

-- 1. Create or replace trigger function
create or replace function public.log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
begin
  -- Resolve actor_id:
  -- Prefer authenticated user making the request (auth.uid())
  -- Fallback to task creator if executed from service_role, seed script, or unauthenticated session
  v_actor_id := auth.uid();
  if v_actor_id is null or not exists (select 1 from public.profiles where id = v_actor_id) then
    v_actor_id := coalesce(new.created_by, old.created_by);
  end if;

  -- Safety check: if actor_id cannot be resolved, do not block the update operation
  if v_actor_id is null then
    return new;
  end if;

  -- Track column_id changes (Kanban status change / Drag & Drop)
  if old.column_id is distinct from new.column_id then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'column_id', old.column_id::text, new.column_id::text);
  end if;

  -- Track priority changes ('low', 'medium', 'high', 'critical')
  if old.priority is distinct from new.priority then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'priority', old.priority::text, new.priority::text);
  end if;

  -- Track assignee_id changes (assigned / reassigned / unassigned)
  if old.assignee_id is distinct from new.assignee_id then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'assignee_id', old.assignee_id::text, new.assignee_id::text);
  end if;

  -- Track due_date changes
  if old.due_date is distinct from new.due_date then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'due_date', old.due_date::text, new.due_date::text);
  end if;

  -- Track title changes
  if old.title is distinct from new.title then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'title', old.title::text, new.title::text);
  end if;

  -- Track description changes
  if old.description is distinct from new.description then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'description', old.description::text, new.description::text);
  end if;

  -- Track project_id changes (task moved between projects)
  if old.project_id is distinct from new.project_id then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'project_id', old.project_id::text, new.project_id::text);
  end if;

  -- Track github_branch changes
  if old.github_branch is distinct from new.github_branch then
    insert into public.activity_log (task_id, actor_id, field_name, old_value, new_value)
    values (new.id, v_actor_id, 'github_branch', old.github_branch::text, new.github_branch::text);
  end if;

  return new;
end;
$$;

-- 2. Drop existing trigger if exists and attach AFTER UPDATE trigger on tasks table
drop trigger if exists on_task_activity_updated on public.tasks;

create trigger on_task_activity_updated
  after update on public.tasks
  for each row
  execute function public.log_task_activity();
