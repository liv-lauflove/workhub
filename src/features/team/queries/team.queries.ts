import 'server-only';
import { createClient } from '@/lib/supabase/server';

import { MANAGEMENT_TEAM_ID } from '../constants';
export { MANAGEMENT_TEAM_ID };

export interface TeamWithStats {
  id: string;
  name: string;
  memberCount: number;
  leaders: string[];
  isManagement: boolean;
  createdAt: string;
}

export async function getTeams() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Get all teams with aggregate member statistics (member count and leaders).
 */
export async function getTeamsWithMemberStats(): Promise<TeamWithStats[]> {
  const supabase = await createClient();

  // 1. Fetch all teams
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (teamsError) throw teamsError;
  if (!teams || teams.length === 0) return [];

  // 2. Fetch all profiles to compute counts and leaders
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, role, team_id');

  if (profilesError) throw profilesError;

  const teamStatsMap = new Map<string, { count: number; leaders: string[] }>();
  for (const team of teams) {
    teamStatsMap.set(team.id, { count: 0, leaders: [] });
  }

  for (const profile of profiles || []) {
    if (profile.team_id && teamStatsMap.has(profile.team_id)) {
      const stat = teamStatsMap.get(profile.team_id)!;
      stat.count += 1;
      if (profile.role === 'leader' && profile.full_name) {
        stat.leaders.push(profile.full_name);
      }
    }
  }

  return teams.map((team) => {
    const stat = teamStatsMap.get(team.id) || { count: 0, leaders: [] };
    const isManagement =
      team.id === MANAGEMENT_TEAM_ID ||
      team.name.trim().toLowerCase() === 'management';

    return {
      id: team.id,
      name: team.name,
      memberCount: stat.count,
      leaders: stat.leaders,
      isManagement,
      createdAt: team.created_at,
    };
  });
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
  if (teamId === MANAGEMENT_TEAM_ID) return true;
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
