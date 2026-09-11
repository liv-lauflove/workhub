import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getTeams() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('teams').select('*');
  if (error) throw error;
  return data;
}

/**
 * Get team members (profiles) for a specific team.
 */
export async function getTeamMembers(teamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, role, team_id, avatar_url, github_username, created_at'
    )
    .eq('team_id', teamId)
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get pending/accepted invitations for a specific team.
 */
export async function getTeamInvitations(teamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('team_invitations')
    .select('id, email, role, status, created_at, expires_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
