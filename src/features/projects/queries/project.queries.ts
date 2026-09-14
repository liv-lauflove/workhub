import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { ProjectWithDetails } from '../types/project.types';

export async function getProjects(): Promise<ProjectWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select(
      '*, milestone:milestones!projects_milestone_id_fkey(id, title), team:teams!projects_team_id_fkey(id, name), pic:profiles!projects_pic_id_fkey(id, full_name, avatar_url)'
    )
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as ProjectWithDetails[]) || [];
}

export async function getProjectById(
  id: string
): Promise<ProjectWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select(
      '*, milestone:milestones!projects_milestone_id_fkey(id, title), team:teams!projects_team_id_fkey(id, name), pic:profiles!projects_pic_id_fkey(id, full_name, avatar_url)'
    )
    .eq('id', id)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching project ${id}:`, error);
    return null;
  }
  return (data as unknown as ProjectWithDetails) || null;
}

export async function getProjectsByMilestoneId(
  milestoneId: string
): Promise<ProjectWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select(
      '*, milestone:milestones!projects_milestone_id_fkey(id, title), team:teams!projects_team_id_fkey(id, name), pic:profiles!projects_pic_id_fkey(id, full_name, avatar_url)'
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
  return (data as unknown as ProjectWithDetails[]) || [];
}
