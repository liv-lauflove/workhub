import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getTasksByProject(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw error;
  return data;
}
