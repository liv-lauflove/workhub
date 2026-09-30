import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { getTeamWorkload } from '@/features/workload/queries/workload.queries';
import { isTaskActive } from '@/features/workload/lib/capacity.utils';
import {
  DashboardPerformanceData,
  DashboardMetrics,
  PriorityDistribution,
  DashboardRecentTask,
  DashboardMemberCapacity,
  QuarterFilter,
} from '../types/dashboard.types';
import type { PriorityLevel } from '@/features/workload/types/workload.types';
import { buildCompletionTrendData } from '../lib/trend.utils';

/**
 * Returns quarter information and date boundaries based on quarter number and year.
 * Defaults to current quarter and year if not specified.
 */
export function getQuarterPeriod(quarter?: number, year?: number) {
  const now = new Date();
  const targetYear =
    year && !isNaN(year) && year >= 2000 && year <= 2100
      ? year
      : now.getFullYear();
  const currentQuarter = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  const targetQuarter =
    quarter && [1, 2, 3, 4].includes(quarter)
      ? (quarter as 1 | 2 | 3 | 4)
      : currentQuarter;

  const startMonth = (targetQuarter - 1) * 3;
  const startDate = new Date(targetYear, startMonth, 1, 0, 0, 0, 0);
  const endDate = new Date(targetYear, startMonth + 3, 0, 23, 59, 59, 999);

  return {
    year: targetYear,
    quarter: targetQuarter,
    label: `Q${targetQuarter} ${targetYear}`,
    startDate,
    endDate,
  };
}

/**
 * Checks whether a task is relevant to the specified quarter interval.
 * Includes:
 * 1. Tasks with due_date within the quarter
 * 2. Tasks created during the quarter
 * 3. Completed tasks whose updated_at falls within the quarter
 * 4. Ongoing active tasks created on or prior to the quarter that have not been finished
 */
export function isTaskInQuarter(
  task: {
    created_at: string;
    updated_at?: string | null;
    due_date?: string | null;
    column?:
      { id: string; name: string } | { id: string; name: string }[] | null;
  },
  startDate: Date,
  endDate: Date
): boolean {
  const start = startDate.getTime();
  const end = endDate.getTime();

  const colName = Array.isArray(task.column)
    ? task.column[0]?.name
    : task.column?.name;
  const isActive = isTaskActive(colName);

  const createTime = task.created_at ? new Date(task.created_at).getTime() : 0;
  const dueTime = task.due_date ? new Date(task.due_date).getTime() : null;
  const updateTime = task.updated_at
    ? new Date(task.updated_at).getTime()
    : null;

  // Task created after the quarter ended did not exist in this quarter
  if (createTime > end) {
    return false;
  }

  // 1. Task has due date in this quarter
  if (dueTime !== null && dueTime >= start && dueTime <= end) {
    return true;
  }

  // 2. Task was created in this quarter
  if (createTime >= start && createTime <= end) {
    return true;
  }

  // 3. Task was completed in this quarter
  if (
    !isActive &&
    updateTime !== null &&
    updateTime >= start &&
    updateTime <= end
  ) {
    return true;
  }

  // 4. Task is active and was created on or before this quarter without an earlier due date
  if (isActive && createTime <= end) {
    if (dueTime === null || dueTime >= start) {
      return true;
    }
  }

  return false;
}

/**
 * Fetches aggregate performance data for the leader's dashboard.
 * Supports team-level scoping, quarter/year filtering, task status breakdown,
 * project metrics, priority distribution, and team capacity integration.
 */
export async function getDashboardPerformance(
  targetTeamId?: string,
  filters?: QuarterFilter
): Promise<DashboardPerformanceData | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Sesi autentikasi tidak valid atau telah berakhir.');
  }

  // 1. Resolve current user profile & team
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, team_id')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'member';
  const teamId = targetTeamId || profile?.team_id || null;

  if (!teamId) {
    return null;
  }

  // 2. Fetch team info
  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', teamId)
    .single();

  const teamName = team?.name || 'My Team';

  // 3. Fetch team workload overview
  const teamWorkload = await getTeamWorkload(teamId);

  // 4. Fetch team projects
  const { data: projectsData, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, status, milestone_id')
    .eq('team_id', teamId)
    .is('archived_at', null);

  if (projectsError) {
    console.error('Error fetching team projects for dashboard:', projectsError);
  }

  const projects = projectsData || [];
  const projectIds = projects.map((p) => p.id);
  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p) => p.status === 'in_progress' || p.status === 'planned'
  ).length;

  // Distinct milestones linked to team projects
  const milestoneIds = new Set(
    projects.map((p) => p.milestone_id).filter(Boolean)
  );
  const totalMilestones = milestoneIds.size;

  // 5. Fetch all tasks within team's projects
  let tasks: Array<{
    id: string;
    title: string;
    priority: string;
    due_date: string | null;
    project_id: string | null;
    created_at: string;
    updated_at: string;
    column:
      { id: string; name: string } | { id: string; name: string }[] | null;
    assignee: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    } | null;
  }> = [];

  if (projectIds.length > 0) {
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        priority,
        due_date,
        project_id,
        created_at,
        updated_at,
        column:board_columns(
          id,
          name
        ),
        assignee:profiles!tasks_assignee_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `
      )
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Error fetching team tasks for dashboard:', tasksError);
    } else {
      tasks = tasksData || [];
    }
  }

  // 6. Filter tasks belonging to target quarter & aggregate metrics
  const quarterPeriod = getQuarterPeriod(filters?.quarter, filters?.year);

  const quarterTasks = tasks.filter((task) =>
    isTaskInQuarter(task, quarterPeriod.startDate, quarterPeriod.endDate)
  );

  let completedTasks = 0;
  let inProgressTasks = 0;

  const priorityDistribution: PriorityDistribution = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  };

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  const recentTasks: DashboardRecentTask[] = [];

  for (const task of quarterTasks) {
    const colName = Array.isArray(task.column)
      ? task.column[0]?.name
      : task.column?.name;

    const isActive = isTaskActive(colName);

    if (isActive) {
      inProgressTasks++;
      // Collect recent active tasks for dashboard widget (up to 5)
      if (recentTasks.length < 5) {
        recentTasks.push({
          id: task.id,
          title: task.title,
          priority: (task.priority || 'medium') as PriorityLevel,
          dueDate: task.due_date,
          projectId: task.project_id,
          projectName: task.project_id
            ? projectMap.get(task.project_id) || null
            : null,
          columnName: colName || 'To Do',
          assignee: task.assignee
            ? {
                id: task.assignee.id,
                fullName: task.assignee.full_name,
                avatarUrl: task.assignee.avatar_url,
              }
            : null,
        });
      }
    } else {
      completedTasks++;
    }

    // Priority breakdown
    const normalizedPriority = (task.priority || 'medium').toLowerCase().trim();
    if (normalizedPriority === 'urgent' || normalizedPriority === 'critical') {
      priorityDistribution.urgent++;
    } else if (normalizedPriority === 'high') {
      priorityDistribution.high++;
    } else if (normalizedPriority === 'medium') {
      priorityDistribution.medium++;
    } else {
      priorityDistribution.low++;
    }
    priorityDistribution.total++;
  }

  const totalTasks = quarterTasks.length;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 7. Member capacities from team workload
  const memberCapacities: DashboardMemberCapacity[] = (
    teamWorkload?.members || []
  ).map((m) => ({
    userId: m.userId,
    fullName: m.fullName,
    avatarUrl: m.avatarUrl,
    role: m.role,
    capacityPercentage: m.capacityPercentage,
    totalWeight: m.totalWeight,
    isOverloaded: m.isOverloaded,
  }));

  const metrics: DashboardMetrics = {
    totalTasks,
    completedTasks,
    inProgressTasks,
    completionRate,
    totalProjects,
    activeProjects,
    totalMilestones,
    overloadedMembersCount: teamWorkload?.overloadedMembersCount || 0,
    teamCapacityPercentage: teamWorkload?.teamCapacityPercentage || 0,
    teamMembersCount: memberCapacities.length,
  };

  const now = new Date();
  const isCurrentQuarter =
    quarterPeriod.year === now.getFullYear() &&
    quarterPeriod.quarter === Math.floor(now.getMonth() / 3) + 1;

  // Anchor trend reference date: current date for ongoing quarter, quarter end for past quarters
  const trendReferenceDate = isCurrentQuarter ? now : quarterPeriod.endDate;

  const trendData = buildCompletionTrendData(
    tasks.map((t) => ({
      id: t.id,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      columnName: Array.isArray(t.column) ? t.column[0]?.name : t.column?.name,
    })),
    Math.max(quarterTasks.length, 1),
    trendReferenceDate
  );

  return {
    teamId,
    teamName,
    userRole,
    currentQuarter: {
      year: quarterPeriod.year,
      quarter: quarterPeriod.quarter,
      label: quarterPeriod.label,
      startDate: quarterPeriod.startDate.toISOString(),
      endDate: quarterPeriod.endDate.toISOString(),
    },
    metrics,
    priorityDistribution,
    recentTasks,
    memberCapacities,
    trendData,
  };
}
