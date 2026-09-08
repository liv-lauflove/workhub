import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getTeams() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('teams').select('*');
  if (error) throw error;
  return data;
}
