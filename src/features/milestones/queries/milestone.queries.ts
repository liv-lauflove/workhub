import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { MilestoneWithDetails } from '../types/milestone.types';

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

export async function getEligiblePICs() {
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
