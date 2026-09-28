import 'server-only';

import { createClient } from '@/lib/supabase/server';
import {
  calculateCapacity,
  isOverloaded,
  calculateTasksWorkload,
  isTaskActive,
} from '../lib/capacity.utils';
import {
  DEFAULT_BASELINE_POINTS,
  type MemberWorkload,
  type TeamWorkloadSummary,
} from '../types/workload.types';

/**
 * Fetches the team workload summary and individual capacity metrics
 * for all members of the specified team (or the current user's team if omitted).
 *
 * Implements PRD §9.6 and Issue #28:
 * - Aggregates active (non-done) tasks per member
 * - Uses static priority weights: High (3), Medium (2), Low (1), Urgent/Critical (4)
 * - Calculates capacity % against team baseline points (from capacity_settings or default 20)
 * - Flags members with > 80% capacity as overloaded
 */
export async function getTeamWorkload(
  targetTeamId?: string
): Promise<TeamWorkloadSummary | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Sesi autentikasi tidak valid atau telah berakhir.');
  }

  // 1. Determine teamId
  let teamId = targetTeamId;
  if (!teamId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single();

    teamId = profile?.team_id || undefined;
  }

  if (!teamId) {
    return null;
  }

  // 2. Fetch team details
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', teamId)
    .single();

  if (teamError || !team) {
    console.error('Error fetching team for workload calculation:', teamError);
    return null;
  }

  // 3. Fetch capacity settings for baseline points
  const { data: capacitySetting } = await supabase
    .from('capacity_settings')
    .select('baseline_points')
    .eq('team_id', teamId)
    .maybeSingle();

  const baselinePoints =
    capacitySetting?.baseline_points && capacitySetting.baseline_points > 0
      ? capacitySetting.baseline_points
      : DEFAULT_BASELINE_POINTS;

  // 4. Fetch team members (profiles)
  const { data: members, error: membersError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, team_id')
    .eq('team_id', teamId)
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  if (membersError || !members) {
    console.error(
      'Error fetching team members for workload calculation:',
      membersError
    );
    return null;
  }

  if (members.length === 0) {
    return {
      teamId: team.id,
      teamName: team.name,
      baselinePoints,
      totalActiveTasks: 0,
      totalTeamWeight: 0,
      teamCapacityPercentage: 0,
      overloadedMembersCount: 0,
      members: [],
    };
  }

  // 5. Fetch all tasks assigned to these members with their column status
  const memberIds = members.map((m) => m.id);
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      priority,
      assignee_id,
      column:board_columns(
        id,
        name
      )
    `
    )
    .in('assignee_id', memberIds);

  if (tasksError) {
    console.error(
      'Error fetching member tasks for workload calculation:',
      tasksError
    );
  }

  const allTasks = tasks || [];

  // 6. Aggregate workload for each member
  const membersWorkload: MemberWorkload[] = members.map((member) => {
    // Filter tasks belonging to this member and in active (non-done) status
    const memberTasks = allTasks.filter(
      (task) =>
        task.assignee_id === member.id &&
        isTaskActive(
          Array.isArray(task.column) ? task.column[0]?.name : task.column?.name
        )
    );

    const metrics = calculateTasksWorkload(
      memberTasks.map((t) => ({
        priority: t.priority,
        column_name: Array.isArray(t.column)
          ? t.column[0]?.name
          : t.column?.name,
      }))
    );

    const capacityPercentage = calculateCapacity(
      metrics.totalWeight,
      baselinePoints
    );
    const memberIsOverloaded = isOverloaded(capacityPercentage);

    return {
      userId: member.id,
      fullName: member.full_name,
      avatarUrl: member.avatar_url,
      role: member.role,
      teamId: member.team_id ?? teamId,
      activeTaskCount: metrics.activeTaskCount,
      totalWeight: metrics.totalWeight,
      baselinePoints,
      capacityPercentage,
      isOverloaded: memberIsOverloaded,
      tasksSummary: metrics.tasksSummary,
    };
  });

  // 7. Aggregate team-level summary
  const totalActiveTasks = membersWorkload.reduce(
    (sum, m) => sum + m.activeTaskCount,
    0
  );
  const totalTeamWeight = membersWorkload.reduce(
    (sum, m) => sum + m.totalWeight,
    0
  );
  const totalTeamBaseline =
    baselinePoints * Math.max(membersWorkload.length, 1);
  const teamCapacityPercentage = calculateCapacity(
    totalTeamWeight,
    totalTeamBaseline
  );
  const overloadedMembersCount = membersWorkload.filter(
    (m) => m.isOverloaded
  ).length;

  return {
    teamId: team.id,
    teamName: team.name,
    baselinePoints,
    totalActiveTasks,
    totalTeamWeight,
    teamCapacityPercentage,
    overloadedMembersCount,
    members: membersWorkload,
  };
}

/**
 * Fetches the workload metrics for a specific member by user ID.
 */
export async function getMemberWorkload(
  userId: string
): Promise<MemberWorkload | null> {
  const supabase = await createClient();

  // 1. Fetch user profile
  const { data: member, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, team_id')
    .eq('id', userId)
    .single();

  if (profileError || !member) {
    return null;
  }

  // 2. Fetch baseline points for the member's team
  let baselinePoints = DEFAULT_BASELINE_POINTS;
  if (member.team_id) {
    const { data: setting } = await supabase
      .from('capacity_settings')
      .select('baseline_points')
      .eq('team_id', member.team_id)
      .maybeSingle();

    if (setting?.baseline_points && setting.baseline_points > 0) {
      baselinePoints = setting.baseline_points;
    }
  }

  // 3. Fetch active tasks for this member
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(
      `
      id,
      priority,
      column:board_columns(
        id,
        name
      )
    `
    )
    .eq('assignee_id', userId);

  if (tasksError) {
    console.error(
      'Error fetching member tasks for workload calculation:',
      tasksError
    );
  }

  const activeTasks = (tasks || []).filter((task) =>
    isTaskActive(
      Array.isArray(task.column) ? task.column[0]?.name : task.column?.name
    )
  );

  const metrics = calculateTasksWorkload(
    activeTasks.map((t) => ({
      priority: t.priority,
      column_name: Array.isArray(t.column) ? t.column[0]?.name : t.column?.name,
    }))
  );

  const capacityPercentage = calculateCapacity(
    metrics.totalWeight,
    baselinePoints
  );
  const memberIsOverloaded = isOverloaded(capacityPercentage);

  return {
    userId: member.id,
    fullName: member.full_name,
    avatarUrl: member.avatar_url,
    role: member.role,
    teamId: member.team_id || '',
    activeTaskCount: metrics.activeTaskCount,
    totalWeight: metrics.totalWeight,
    baselinePoints,
    capacityPercentage,
    isOverloaded: memberIsOverloaded,
    tasksSummary: metrics.tasksSummary,
  };
}
