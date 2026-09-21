import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import type { PaginationParams, PaginatedResult } from '@/types/global';
import type { Task } from '../types/task.types';

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
