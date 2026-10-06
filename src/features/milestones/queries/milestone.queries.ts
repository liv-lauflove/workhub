import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { MilestoneWithDetails } from '../types/milestone.types';
import {
  calculateDualTrackProgress,
  type DualTrackProgress,
} from '@/features/workload/lib/workload-engine';

export async function getMilestones(): Promise<MilestoneWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('milestones')
    .select(
      '*, pic:profiles!milestones_pic_id_fkey(id, full_name, avatar_url), projects(count)'
    )
    .is('archived_at', null)
    .order('target_date', { ascending: true });

  if (error) throw error;
  return (data as unknown as MilestoneWithDetails[]) || [];
}

export async function getMilestoneById(
  id: string
): Promise<MilestoneWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('milestones')
    .select(
      '*, pic:profiles!milestones_pic_id_fkey(id, full_name, avatar_url), projects(*)'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching milestone ${id}:`, error);
    return null;
  }
  return (data as unknown as MilestoneWithDetails) || null;
}

export async function getEligiblePICs(): Promise<
  Array<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    team_id: string | null;
  }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, team_id')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching eligible PICs:', error);
    return [];
  }
  return data || [];
}

/**
 * Calculates tiered Dual-Track Progress for a milestone (Issue #95).
 * Aggregates all tasks across projects under this milestone.
 */
export async function getMilestoneDualTrackProgress(
  milestoneId: string
): Promise<DualTrackProgress> {
  const supabase = await createClient();

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id')
    .eq('milestone_id', milestoneId);

  if (projectsError || !projects || projects.length === 0) {
    return {
      totalTasks: 0,
      devDoneTasks: 0,
      testPassedTasks: 0,
      fullyCompletedTasks: 0,
      devProgress: 0,
      testProgress: 0,
      overallProgress: 0,
    };
  }

  const projectIds = projects.map((p) => p.id);
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(
      `
      id,
      dev_status,
      test_status,
      column:board_columns(
        name
      )
    `
    )
    .in('project_id', projectIds);

  if (tasksError || !tasks) {
    return {
      totalTasks: 0,
      devDoneTasks: 0,
      testPassedTasks: 0,
      fullyCompletedTasks: 0,
      devProgress: 0,
      testProgress: 0,
      overallProgress: 0,
    };
  }

  return calculateDualTrackProgress(
    tasks.map((t) => ({
      dev_status: t.dev_status,
      test_status: t.test_status,
      column_name: Array.isArray(t.column) ? t.column[0]?.name : t.column?.name,
    }))
  );
}
