import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getMilestones() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('milestones')
    .select(
      '*, pic:profiles!milestones_pic_id_fkey(id, full_name, avatar_url), projects(count)'
    )
    .is('archived_at', null)
    .order('target_date', { ascending: true });

  if (error) throw error;
  return data;
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
