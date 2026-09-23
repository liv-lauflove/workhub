import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import type { PaginationParams, PaginatedResult } from '@/types/global';
import type { Task, MyTask, TaskDetail } from '../types/task.types';

const MY_TASKS_SELECT_QUERY = `
  *,
  project:projects(
    id,
    name,
    milestone:milestones(id, title)
  ),
  column:board_columns(
    id,
    name,
    position
  )
`;

const TASK_DETAIL_SELECT_QUERY = `
  *,
  project:projects(
    id,
    name,
    team_id,
    milestone:milestones(
      id,
      title,
      target_date,
      status
    )
  ),
  column:board_columns(
    id,
    name,
    position
  ),
  assignee:profiles!tasks_assignee_id_fkey(
    id,
    full_name,
    avatar_url
  ),
  creator:profiles!tasks_created_by_fkey(
    id,
    full_name,
    avatar_url
  )
`;

/**
 * Fetch tasks assigned to the currently logged-in user.
 * Ordered by due_date ascending (nulls last) and created_at descending.
 * Filtered securely by assignee_id = auth.uid().
 */
export async function getMyTasks(): Promise<MyTask[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(MY_TASKS_SELECT_QUERY)
    .eq('assignee_id', user.id)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching my tasks:', error);
    return [];
  }

  return (data as unknown as MyTask[]) || [];
}

/**
 * Fetch tasks for a specific project with pagination & range limits.
 * Default and maximum page size is capped at DEFAULT_PAGE_SIZE (20).
 */
export async function getTasksByProject(
  projectId: string,
  params: PaginationParams = {}
): Promise<PaginatedResult<Task>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(
    Math.max(1, params.pageSize || DEFAULT_PAGE_SIZE),
    DEFAULT_PAGE_SIZE
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: data || [],
    metadata: {
      page,
      pageSize,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Fetch all tasks across projects with pagination & range limits.
 */
export async function getTasks(
  params: PaginationParams = {}
): Promise<PaginatedResult<Task>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(
    Math.max(1, params.pageSize || DEFAULT_PAGE_SIZE),
    DEFAULT_PAGE_SIZE
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: data || [],
    metadata: {
      page,
      pageSize,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Fetch detailed task data by ID with full relations (project, milestone, column, assignee, creator).
 */
export async function getTaskDetailById(
  taskId: string
): Promise<TaskDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_DETAIL_SELECT_QUERY)
    .eq('id', taskId)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching task detail for id ${taskId}:`, error);
    return null;
  }

  return (data as unknown as TaskDetail) || null;
}

/**
 * Fetch all board columns for a given project.
 */
export async function getProjectColumns(
  projectId: string
): Promise<{ id: string; name: string; position: number }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('board_columns')
    .select('id, name, position')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  if (error) {
    console.error(`Error fetching columns for project ${projectId}:`, error);
    return [];
  }

  return data || [];
}
