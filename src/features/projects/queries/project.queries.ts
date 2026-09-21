import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import type { PaginationParams, PaginatedResult } from '@/types/global';
import type { ProjectWithProgress } from '../types/project.types';

interface RawProjectQueryResult {
  id: string;
  name: string;
  description: string | null;
  status: ProjectWithProgress['status'];
  milestone_id: string;
  team_id: string;
  pic_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  milestone?: {
    id: string;
    title: string;
  } | null;
  team?: {
    id: string;
    name: string;
    members?: Array<{ id: string }> | null;
  } | null;
  pic?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  total_tasks?: Array<{ count: number }> | null;
  board_columns?: Array<{
    id: string;
    name: string;
    tasks?: Array<{ count: number }> | null;
  }> | null;
  tasks?: Array<{
    id: string;
    column?: { id: string; name: string } | null;
  }> | null;
}

const PROJECT_SELECT_QUERY = `
  *,
  milestone:milestones!projects_milestone_id_fkey(id, title),
  team:teams!projects_team_id_fkey(
    id,
    name,
    members:profiles!profiles_team_id_fkey(id)
  ),
  pic:profiles!projects_pic_id_fkey(id, full_name, avatar_url),
  total_tasks:tasks(count),
  board_columns(
    id,
    name,
    tasks(count)
  )
`;

function mapProjectWithProgress(p: RawProjectQueryResult): ProjectWithProgress {
  let totalTasks = 0;
  let completedTasks = 0;

  if (p.total_tasks && p.total_tasks.length > 0) {
    totalTasks = p.total_tasks[0]?.count || 0;
    const doneCol = p.board_columns?.find(
      (c) => c.name.toLowerCase() === 'done'
    );
    completedTasks = doneCol?.tasks?.[0]?.count || 0;
  } else if (p.tasks) {
    totalTasks = p.tasks.length;
    completedTasks = p.tasks.filter(
      (t) => t.column?.name?.toLowerCase() === 'done'
    ).length;
  }

  const progress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const memberCount = p.team?.members?.length || 0;

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    milestone_id: p.milestone_id,
    team_id: p.team_id,
    pic_id: p.pic_id,
    created_by: p.created_by,
    created_at: p.created_at,
    updated_at: p.updated_at,
    archived_at: p.archived_at,
    milestone: p.milestone,
    team: p.team
      ? {
          id: p.team.id,
          name: p.team.name,
        }
      : null,
    pic: p.pic,
    totalTasks,
    completedTasks,
    progress,
    memberCount,
  };
}

/**
 * Fetch projects with pagination & range limits.
 * Default and maximum page size is capped at DEFAULT_PAGE_SIZE (20).
 */
export async function getProjects(
  params: PaginationParams = {}
): Promise<PaginatedResult<ProjectWithProgress>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(
    Math.max(1, params.pageSize || DEFAULT_PAGE_SIZE),
    DEFAULT_PAGE_SIZE
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from('projects')
    .select(PROJECT_SELECT_QUERY, { count: 'exact' })
    .is('archived_at', null)
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: (data || []).map((p) =>
      mapProjectWithProgress(p as unknown as RawProjectQueryResult)
    ),
    metadata: {
      page,
      pageSize,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

export async function getProjectById(
  id: string
): Promise<ProjectWithProgress | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT_QUERY)
    .eq('id', id)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching project ${id}:`, error);
    return null;
  }
  return data
    ? mapProjectWithProgress(data as unknown as RawProjectQueryResult)
    : null;
}

/**
 * Fetch projects isolated to a specific milestone ID with pagination.
 * Strict isolation: only projects linked to the milestone are returned.
 */
export async function getProjectsByMilestoneId(
  milestoneId: string,
  params: PaginationParams = {}
): Promise<PaginatedResult<ProjectWithProgress>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(
    Math.max(1, params.pageSize || DEFAULT_PAGE_SIZE),
    DEFAULT_PAGE_SIZE
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from('projects')
    .select(PROJECT_SELECT_QUERY, { count: 'exact' })
    .eq('milestone_id', milestoneId)
    .is('archived_at', null)
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(
      `Error fetching projects for milestone ${milestoneId}:`,
      error
    );
    return {
      data: [],
      metadata: {
        page,
        pageSize,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: (data || []).map((p) =>
      mapProjectWithProgress(p as unknown as RawProjectQueryResult)
    ),
    metadata: {
      page,
      pageSize,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}
