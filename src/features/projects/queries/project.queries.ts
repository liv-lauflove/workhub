import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getProjects() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .is('archived_at', null);

  if (error) throw error;
  return data;
}
