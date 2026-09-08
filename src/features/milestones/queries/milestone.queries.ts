import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getMilestones() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('milestones')
    .select('*, projects(count)')
    .is('archived_at', null)
    .order('target_date', { ascending: true });

  if (error) throw error;
  return data;
}
