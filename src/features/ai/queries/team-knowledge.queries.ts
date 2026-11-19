import 'server-only';
import type { createClient } from '@/lib/supabase/server';

type Db = Awaited<ReturnType<typeof createClient>>;
const documentFields =
  'id, team_id, title, version, status, markdown, published_at';

export async function getPublishedKnowledge(supabase: Db, teamId: string) {
  return getTeamKnowledgeByStatus(supabase, teamId, 'published');
}

export async function getTeamKnowledgeByStatus(
  supabase: Db,
  teamId: string,
  status: 'published' | 'draft'
) {
  const { data, error } = await supabase
    .from('ai_knowledge_documents')
    .select(documentFields)
    .eq('team_id', teamId)
    .eq('status', status)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getKnowledgeDocument(
  supabase: Db,
  id: string,
  status: 'draft' | 'published'
) {
  const { data, error } = await supabase
    .from('ai_knowledge_documents')
    .select(documentFields)
    .eq('id', id)
    .eq('status', status)
    .maybeSingle();
  if (error) throw error;
  return data;
}
