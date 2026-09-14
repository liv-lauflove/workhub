import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
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
  tasks?: Array<{
    id: string;
    column?: { id: string; name: string } | null;
  }> | null;
}

function mapProjectWithProgress(p: RawProjectQueryResult): ProjectWithProgress {
  const tasks = p.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (t) => t.column?.name?.toLowerCase() === 'done'
  ).length;
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

export async function getProjects(): Promise<ProjectWithProgress[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      milestone:milestones!projects_milestone_id_fkey(id, title),
      team:teams!projects_team_id_fkey(
        id,
        name,
        members:profiles!profiles_team_id_fkey(id)
      ),
      pic:profiles!projects_pic_id_fkey(id, full_name, avatar_url),
      tasks(
        id,
        column:board_columns(id, name)
      )
    `
    )
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapProjectWithProgress);
}

export async function getProjectById(
  id: string
): Promise<ProjectWithProgress | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      milestone:milestones!projects_milestone_id_fkey(id, title),
      team:teams!projects_team_id_fkey(
        id,
        name,
        members:profiles!profiles_team_id_fkey(id)
      ),
      pic:profiles!projects_pic_id_fkey(id, full_name, avatar_url),
      tasks(
        id,
        column:board_columns(id, name)
      )
    `
    )
    .eq('id', id)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching project ${id}:`, error);
    return null;
  }
  return data ? mapProjectWithProgress(data) : null;
}

/**
 * Fetch projects isolated to a specific milestone ID.
 * Strict isolation: only projects linked to the milestone are returned.
 */
export async function getProjectsByMilestoneId(
  milestoneId: string
): Promise<ProjectWithProgress[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      milestone:milestones!projects_milestone_id_fkey(id, title),
      team:teams!projects_team_id_fkey(
        id,
        name,
        members:profiles!profiles_team_id_fkey(id)
      ),
      pic:profiles!projects_pic_id_fkey(id, full_name, avatar_url),
      tasks(
        id,
        column:board_columns(id, name)
      )
    `
    )
    .eq('milestone_id', milestoneId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(
      `Error fetching projects for milestone ${milestoneId}:`,
      error
    );
    return [];
  }

  return (data || []).map(mapProjectWithProgress);
}
