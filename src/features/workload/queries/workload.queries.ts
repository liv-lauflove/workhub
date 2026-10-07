import 'server-only';

import { createClient } from '@/lib/supabase/server';
import {
  calculateCapacity,
  isOverloaded,
  calculateMemberDynamicWorkload,
  extractCriticalWatchlistTasks,
  calculateDualTrackProgress,
  type TaskLike,
} from '../lib/capacity.utils';
import {
  DEFAULT_BASELINE_POINTS,
  type MemberWorkload,
  type TeamWorkloadSummary,
  type CriticalWatchlistTask,
  type DualTrackProgress,
} from '../types/workload.types';

/**
 * Fetches the team workload summary and individual capacity metrics
 * for all members of the specified team (or the current user's team if omitted).
 *
 * Implements PRD §9.6 and Issue #95 (Dynamic Workload Score & Dual-Track Role Allocation):
 * - Aggregates active tasks per member taking into account Developer and Tester roles
 * - Dynamic Urgency Multiplier (Critical 2.0x, High 1.5x, Medium 1.0x, Low 0.5x)
 * - Dynamic Deadline Multiplier (Overdue 2.0x, <=72h 1.5x, 4-7d 1.0x, >7d 0.7x)
 * - Shift workload: Dev bears load until dev_done, Tester bears load during testing until passed
 * - Completed tasks yield 0 points, liberating capacity
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

  // 5. Fetch all tasks where these members are either assignee, developer, or tester
  const memberIds = members.map((m) => m.id);
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      priority,
      due_date,
      assignee_id,
      developer_id,
      tester_id,
      dev_status,
      test_status,
      column:board_columns(
        id,
        name
      )
    `
    )
    .or(
      `assignee_id.in.(${memberIds.join(',')}),developer_id.in.(${memberIds.join(',')}),tester_id.in.(${memberIds.join(',')})`
    );

  if (tasksError) {
    console.error(
      'Error fetching member tasks for workload calculation:',
      tasksError
    );
  }

  const allTasks: TaskLike[] = (tasks || []).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date,
    assignee_id: t.assignee_id,
    developer_id: t.developer_id,
    tester_id: t.tester_id,
    dev_status: t.dev_status,
    test_status: t.test_status,
    column_name: Array.isArray(t.column) ? t.column[0]?.name : t.column?.name,
  }));

  // 6. Aggregate dynamic workload for each member (Issue #95)
  const referenceDate = new Date();
  const membersWorkload: MemberWorkload[] = members.map((member) => {
    const metrics = calculateMemberDynamicWorkload(
      member.id,
      allTasks,
      referenceDate
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
      dynamicTasks: metrics.dynamicTasks,
    };
  });

  // 7. Aggregate team-level summary
  const totalActiveTasks = membersWorkload.reduce(
    (sum, m) => sum + m.activeTaskCount,
    0
  );
  const totalTeamWeight =
    Math.round(
      membersWorkload.reduce((sum, m) => sum + m.totalWeight, 0) * 10
    ) / 10;
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
 * Fetches the dynamic workload metrics for a specific member by user ID.
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

  // 3. Fetch active tasks where user is assignee, developer, or tester
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      priority,
      due_date,
      assignee_id,
      developer_id,
      tester_id,
      dev_status,
      test_status,
      column:board_columns(
        id,
        name
      )
    `
    )
    .or(
      `assignee_id.eq.${userId},developer_id.eq.${userId},tester_id.eq.${userId}`
    );

  if (tasksError) {
    console.error(
      'Error fetching member tasks for workload calculation:',
      tasksError
    );
  }

  const allTasks: TaskLike[] = (tasks || []).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date,
    assignee_id: t.assignee_id,
    developer_id: t.developer_id,
    tester_id: t.tester_id,
    dev_status: t.dev_status,
    test_status: t.test_status,
    column_name: Array.isArray(t.column) ? t.column[0]?.name : t.column?.name,
  }));

  const metrics = calculateMemberDynamicWorkload(userId, allTasks, new Date());

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
    dynamicTasks: metrics.dynamicTasks,
  };
}

/**
 * Fetches the Critical Watchlist tasks (< 72 Jam / <= 3 Hari, High/Critical priority)
 * for a team or across accessible projects (Issue #95 & #96).
 */
export async function getTeamCriticalWatchlist(
  targetTeamId?: string
): Promise<CriticalWatchlistTask[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  let teamId = targetTeamId;
  if (!teamId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single();

    teamId = profile?.team_id || undefined;
  }

  // Fetch High and Critical priority tasks with deadlines
  let query = supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      priority,
      due_date,
      dev_status,
      test_status,
      column:board_columns(
        id,
        name
      ),
      developer:profiles!tasks_developer_id_fkey(
        id,
        full_name,
        avatar_url
      ),
      tester:profiles!tasks_tester_id_fkey(
        id,
        full_name,
        avatar_url
      ),
      assignee:profiles!tasks_assignee_id_fkey(
        id,
        full_name,
        avatar_url
      )
    `
    )
    .not('due_date', 'is', null)
    .in('priority', ['high', 'critical', 'urgent']);

  if (teamId) {
    // Filter tasks where project belongs to this team
    const { data: teamProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('team_id', teamId);

    const projectIds = (teamProjects || []).map((p) => p.id);
    if (projectIds.length > 0) {
      query = query.in('project_id', projectIds);
    }
  }

  const { data: tasks, error } = await query;
  if (error || !tasks) {
    console.error('Error fetching critical watchlist tasks:', error);
    return [];
  }

  const formattedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date,
    dev_status: t.dev_status,
    test_status: t.test_status,
    column_name: Array.isArray(t.column) ? t.column[0]?.name : t.column?.name,
    developer: Array.isArray(t.developer) ? t.developer[0] : t.developer,
    tester: Array.isArray(t.tester) ? t.tester[0] : t.tester,
    assignee: Array.isArray(t.assignee) ? t.assignee[0] : t.assignee,
  }));

  return extractCriticalWatchlistTasks(formattedTasks, new Date());
}

/**
 * Calculates Dual-Track Progress for a project or milestone (Issue #95).
 */
export async function getDualTrackProgressOverview(options?: {
  projectId?: string;
  milestoneId?: string;
}): Promise<DualTrackProgress> {
  const supabase = await createClient();

  let query = supabase.from('tasks').select(
    `
    id,
    dev_status,
    test_status,
    column:board_columns(
      name
    )
  `
  );

  if (options?.projectId) {
    query = query.eq('project_id', options.projectId);
  } else if (options?.milestoneId) {
    const { data: milestoneProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('milestone_id', options.milestoneId);

    const projectIds = (milestoneProjects || []).map((p) => p.id);
    if (projectIds.length === 0) {
      return {
        totalTasks: 0,
        devDoneTasks: 0,
        testPassedTasks: 0,
        fullyCompletedTasks: 0,
        devProgress: 0,
        testProgress: 0,
        overallProgress: 0,
      };
    }
    query = query.in('project_id', projectIds);
  }

  const { data: tasks, error } = await query;
  if (error || !tasks) {
    return {
      totalTasks: 0,
      devDoneTasks: 0,
      testPassedTasks: 0,
      fullyCompletedTasks: 0,
      devProgress: 0,
      testProgress: 0,
      overallProgress: 0,
    };
  }

  return calculateDualTrackProgress(
    tasks.map((t) => ({
      dev_status: t.dev_status,
      test_status: t.test_status,
      column_name: Array.isArray(t.column) ? t.column[0]?.name : t.column?.name,
    }))
  );
}
