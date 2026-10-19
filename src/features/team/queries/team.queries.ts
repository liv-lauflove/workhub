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
      'id, full_name, role, team_id, avatar_url, github_username, created_at, position, capacity_points'
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

/**
 * Check if a team ID belongs to the Management team.
 */
export async function isManagementTeam(
  teamId?: string | null
): Promise<boolean> {
  if (!teamId) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .maybeSingle();

  if (error || !data) return false;
  return data.name === 'Management';
}

/**
 * Get assignable members for a project or task:
 * Returns all members of the target team PLUS all members of the Management team
 * so Management (Head of Tech / Kak Yoga) can always be assigned as Developer or Tester QA.
 */
export async function getAssignableTeamMembers(projectTeamId?: string | null) {
  const supabase = await createClient();

  // 1. Fetch Management team ID
  const { data: managementTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('name', 'Management')
    .maybeSingle();

  const teamIds: string[] = [];
  if (projectTeamId) {
    teamIds.push(projectTeamId);
  }
  if (managementTeam?.id && !teamIds.includes(managementTeam.id)) {
    teamIds.push(managementTeam.id);
  }

  if (teamIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, role, team_id, avatar_url, github_username, created_at, position, capacity_points'
    )
    .in('team_id', teamIds)
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get all members across all teams (Aegis, Sentinel, Management).
 */
export async function getAllTeamMembers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      id, full_name, role, team_id, avatar_url, github_username, created_at, position, capacity_points,
      team:teams(id, name)
    `
    )
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  if (error) throw error;

  return (data || []).map((m) => {
    const teamObj = Array.isArray(m.team) ? m.team[0] : m.team;
    return {
      ...m,
      team_name: teamObj?.name ?? 'Tanpa Tim',
    };
  });
}

/**
 * Get pending/accepted invitations for all teams (Executive overview).
 */
export async function getAllTeamInvitations() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('team_invitations')
    .select(
      `
      id, email, role, status, created_at, expires_at, team_id,
      team:teams(id, name)
    `
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((inv) => {
    const teamObj = Array.isArray(inv.team) ? inv.team[0] : inv.team;
    return {
      ...inv,
      team_name: teamObj?.name ?? 'Tim',
    };
  });
}
