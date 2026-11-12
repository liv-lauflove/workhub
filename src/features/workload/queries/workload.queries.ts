import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { buildActivityPulse } from '@/lib/activity-pulse.utils';
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

interface RawMemberTaskForPulse {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  assignee_id: string | null;
  developer_id: string | null;
  tester_id: string | null;
  dev_status: string | null;
  test_status: string | null;
  column?: { id: string; name: string } | { id: string; name: string }[] | null;
  github_commits?: Array<{
    committed_at?: string | null;
    author_username?: string | null;
  }> | null;
  task_subtasks?: Array<{
    created_at?: string | null;
    tested_at?: string | null;
    tested_by?: string | null;
    is_completed?: boolean | null;
  }> | null;
}

function computeMemberActivityPulse(
  member: { id: string; github_username?: string | null },
  rawTasks: RawMemberTaskForPulse[],
  activityLogs: Array<{
    actor_id: string;
    task_id: string;
    created_at: string;
  }>,
  activeTaskCount: number,
  referenceDate: Date
) {
  const commitTimestamps: string[] = [];
  const taskCreatedTimestamps: string[] = [];
  const taskMovementTimestamps: string[] = [];

  const memberGithub = member.github_username?.toLowerCase().trim() || null;

  const memberLogs = activityLogs.filter((l) => l.actor_id === member.id);
  const loggedTaskIds = new Set<string>();
  for (const log of memberLogs) {
    if (log.created_at) {
      taskMovementTimestamps.push(log.created_at);
      loggedTaskIds.add(log.task_id);
    }
  }

  for (const t of rawTasks) {
    const isDevOrAssignee =
      t.developer_id === member.id || t.assignee_id === member.id;
    const isTester = t.tester_id === member.id;

    if (t.created_by === member.id && t.created_at) {
      taskCreatedTimestamps.push(t.created_at);
    }

    if (t.github_commits && t.github_commits.length > 0) {
      for (const c of t.github_commits) {
        if (!c.committed_at) continue;
        const commitAuthor = c.author_username?.toLowerCase().trim() || null;
        if (
          (memberGithub && commitAuthor === memberGithub) ||
          (!commitAuthor && isDevOrAssignee) ||
          isDevOrAssignee
        ) {
          commitTimestamps.push(c.committed_at);
        }
      }
    }

    if (t.task_subtasks && t.task_subtasks.length > 0) {
      for (const sub of t.task_subtasks) {
        if (sub.tested_by === member.id && sub.tested_at) {
          taskMovementTimestamps.push(sub.tested_at);
        } else if (
          !sub.tested_by &&
          sub.is_completed &&
          isDevOrAssignee &&
          (sub.tested_at || sub.created_at)
        ) {
          taskMovementTimestamps.push((sub.tested_at || sub.created_at)!);
        }
      }
    }

    // Fallback for progressed tasks without explicit activity_log entries by this member
    if (!loggedTaskIds.has(t.id) && t.updated_at) {
      const progressedByDev =
        isDevOrAssignee &&
        (t.dev_status === 'in_progress' || t.dev_status === 'dev_done');
      const progressedByTester =
        isTester &&
        (t.test_status === 'testing' ||
          t.test_status === 'passed' ||
          t.test_status === 'failed');

      if (progressedByDev || progressedByTester) {
        taskMovementTimestamps.push(t.updated_at);
      }
    }
  }

  return buildActivityPulse({
    commitTimestamps,
    taskCreatedTimestamps,
    taskMovementTimestamps,
    activeTaskCount,
    mode: 'member',
    referenceDate,
  });
}

/**
 * Fetches the team workload summary and individual capacity metrics
 * for all members of the specified team (or the current user's team if omitted).
 *
 * Implements PRD §9.6, Issue #95 (Dynamic Workload Score & Dual-Track Role Allocation),
 * and Issue #142 (2-Month Member Activity Pulse).
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

  const isAllTeams = teamId === 'all';

  // Parallel fetch: team details + members (independent queries)
  let membersQuery = supabase
    .from('profiles')
    .select(
      'id, full_name, avatar_url, role, team_id, position, capacity_points, github_username'
    )
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  if (!isAllTeams) {
    membersQuery = membersQuery.eq('team_id', teamId);
  }

  // Build team info promise
  const teamInfoPromise = (async () => {
    if (isAllTeams) {
      return {
        teamName: 'Semua Tim (BSA Tech)',
        baselinePoints: DEFAULT_BASELINE_POINTS,
      };
    }
    const [{ data: team, error: teamError }, { data: capacitySetting }] =
      await Promise.all([
        supabase.from('teams').select('id, name').eq('id', teamId!).single(),
        supabase
          .from('capacity_settings')
          .select('baseline_points')
          .eq('team_id', teamId!)
          .maybeSingle(),
      ]);

    if (teamError || !team) {
      console.error('Error fetching team for workload calculation:', teamError);
      return null;
    }

    const bp =
      capacitySetting?.baseline_points && capacitySetting.baseline_points > 0
        ? capacitySetting.baseline_points
        : DEFAULT_BASELINE_POINTS;

    return { teamName: team.name, baselinePoints: bp };
  })();

  const [teamInfo, { data: members, error: membersError }] = await Promise.all([
    teamInfoPromise,
    membersQuery,
  ]);

  if (!teamInfo) {
    return null;
  }

  const { teamName, baselinePoints } = teamInfo;

  if (membersError || !members) {
    console.error(
      'Error fetching team members for workload calculation:',
      membersError
    );
    return null;
  }

  if (members.length === 0) {
    return {
      teamId: isAllTeams ? 'all' : teamId,
      teamName,
      baselinePoints,
      totalActiveTasks: 0,
      totalTeamWeight: 0,
      teamCapacityPercentage: 0,
      overloadedMembersCount: 0,
      members: [],
    };
  }

  // 5. Fetch all tasks where these members are assignee, developer, tester, or creator
  // AND fetch 60-day activity logs in parallel
  const memberIds = members.map((m) => m.id);
  const referenceDate = new Date();
  const sixtyDaysAgo = new Date(referenceDate);
  sixtyDaysAgo.setDate(referenceDate.getDate() - 60);
  const sixtyDaysAgoIso = sixtyDaysAgo.toISOString();

  const [
    { data: tasks, error: tasksError },
    { data: activityLogsData, error: logsError },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        priority,
        due_date,
        created_by,
        created_at,
        updated_at,
        assignee_id,
        developer_id,
        tester_id,
        dev_status,
        test_status,
        column:board_columns(
          id,
          name
        ),
        github_commits(
          committed_at,
          author_username
        ),
        task_subtasks(
          created_at,
          tested_at,
          tested_by,
          is_completed
        )
      `
      )
      .or(
        `assignee_id.in.(${memberIds.join(',')}),developer_id.in.(${memberIds.join(',')}),tester_id.in.(${memberIds.join(',')}),created_by.in.(${memberIds.join(',')})`
      ),
    supabase
      .from('activity_log')
      .select('actor_id, task_id, created_at')
      .in('actor_id', memberIds)
      .gte('created_at', sixtyDaysAgoIso),
  ]);

  if (tasksError) {
    console.error(
      'Error fetching member tasks for workload calculation:',
      tasksError
    );
  }
  if (logsError) {
    console.error(
      'Error fetching member activity logs for pulse calculation:',
      logsError
    );
  }

  const rawTasks = (tasks || []) as unknown as RawMemberTaskForPulse[];
  const activityLogs = activityLogsData || [];

  const allTasks: TaskLike[] = rawTasks.map((t) => ({
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

  // 6. Aggregate dynamic workload + 2-month activity pulse for each member
  const membersWorkload: MemberWorkload[] = members.map((member) => {
    const metrics = calculateMemberDynamicWorkload(
      member.id,
      allTasks,
      referenceDate
    );

    // Individual capacity points determined by Leader (Issue #106), fallback to team baseline
    const memberCapacity =
      member.capacity_points && member.capacity_points > 0
        ? member.capacity_points
        : baselinePoints;

    const capacityPercentage = calculateCapacity(
      metrics.totalWeight,
      memberCapacity
    );
    const memberIsOverloaded = isOverloaded(capacityPercentage);

    const activityPulse = computeMemberActivityPulse(
      member,
      rawTasks,
      activityLogs,
      metrics.activeTaskCount,
      referenceDate
    );

    return {
      userId: member.id,
      fullName: member.full_name,
      avatarUrl: member.avatar_url,
      role: member.role,
      position: member.position ?? null,
      capacityPoints: memberCapacity,
      teamId: member.team_id ?? teamId,
      activeTaskCount: metrics.activeTaskCount,
      totalWeight: metrics.totalWeight,
      baselinePoints: memberCapacity,
      capacityPercentage,
      isOverloaded: memberIsOverloaded,
      tasksSummary: metrics.tasksSummary,
      dynamicTasks: metrics.dynamicTasks,
      activityPulse,
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
    teamId: isAllTeams ? 'all' : teamId,
    teamName,
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
    .select('id, full_name, avatar_url, role, team_id, github_username')
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

  // 3. Fetch active tasks and 60-day activity logs in parallel
  const referenceDate = new Date();
  const sixtyDaysAgo = new Date(referenceDate);
  sixtyDaysAgo.setDate(referenceDate.getDate() - 60);

  const [
    { data: tasks, error: tasksError },
    { data: activityLogsData, error: logsError },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        priority,
        due_date,
        created_by,
        created_at,
        updated_at,
        assignee_id,
        developer_id,
        tester_id,
        dev_status,
        test_status,
        column:board_columns(
          id,
          name
        ),
        github_commits(
          committed_at,
          author_username
        ),
        task_subtasks(
          created_at,
          tested_at,
          tested_by,
          is_completed
        )
      `
      )
      .or(
        `assignee_id.eq.${userId},developer_id.eq.${userId},tester_id.eq.${userId},created_by.eq.${userId}`
      ),
    supabase
      .from('activity_log')
      .select('actor_id, task_id, created_at')
      .eq('actor_id', userId)
      .gte('created_at', sixtyDaysAgo.toISOString()),
  ]);

  if (tasksError) {
    console.error(
      'Error fetching member tasks for workload calculation:',
      tasksError
    );
  }
  if (logsError) {
    console.error(
      'Error fetching member activity logs for pulse calculation:',
      logsError
    );
  }

  const rawTasks = (tasks || []) as unknown as RawMemberTaskForPulse[];
  const allTasks: TaskLike[] = rawTasks.map((t) => ({
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

  const metrics = calculateMemberDynamicWorkload(
    userId,
    allTasks,
    referenceDate
  );

  const capacityPercentage = calculateCapacity(
    metrics.totalWeight,
    baselinePoints
  );
  const memberIsOverloaded = isOverloaded(capacityPercentage);

  const activityPulse = computeMemberActivityPulse(
    member,
    rawTasks,
    activityLogsData || [],
    metrics.activeTaskCount,
    referenceDate
  );

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
    activityPulse,
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

  if (teamId && teamId !== 'all') {
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
