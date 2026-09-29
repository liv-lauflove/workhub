import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { getTeamWorkload } from '@/features/workload/queries/workload.queries';
import { isTaskActive } from '@/features/workload/lib/capacity.utils';
import type {
  DashboardPerformanceData,
  DashboardMetrics,
  PriorityDistribution,
  DashboardRecentTask,
  DashboardMemberCapacity,
} from '../types/dashboard.types';
import type { PriorityLevel } from '@/features/workload/types/workload.types';

/**
 * Returns current quarter information based on date.
 */
function getCurrentQuarterInfo(date: Date = new Date()) {
  const month = date.getMonth(); // 0 - 11
  const quarter = (Math.floor(month / 3) + 1) as 1 | 2 | 3 | 4;
  const year = date.getFullYear();

  return {
    year,
    quarter,
    label: `Q${quarter} ${year}`,
  };
}

/**
 * Fetches aggregate performance data for the leader's dashboard.
 * Supports team-level scoping, task status breakdown, project metrics,
 * priority distribution, and team capacity integration.
 */
export async function getDashboardPerformance(
  targetTeamId?: string
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

  // 6. Aggregate task metrics
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

  for (const task of tasks) {
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

  const totalTasks = tasks.length;
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

  return {
    teamId,
    teamName,
    userRole,
    currentQuarter: getCurrentQuarterInfo(),
    metrics,
    priorityDistribution,
    recentTasks,
    memberCapacities,
  };
}
