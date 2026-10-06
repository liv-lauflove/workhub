/**
 * Dynamic Workload & Dual-Track Multi-Tier Progress Engine.
 * Implements PRD §9.6, Issue #28, and Issue #95.
 */

import {
  BASE_TASK_LOAD_POINTS,
  URGENCY_MULTIPLIERS,
  DEADLINE_MULTIPLIERS,
  type DynamicTaskScore,
  type DualTrackProgress,
  type CriticalWatchlistTask,
} from '../types/workload.types';

export type { DualTrackProgress, DynamicTaskScore, CriticalWatchlistTask };

export interface WorkloadTaskInput {
  id: string;
  title?: string;
  priority?: string | null;
  due_date?: string | null;
  column_name?: string | null;
  dev_status?: string | null;
  test_status?: string | null;
  developer_id?: string | null;
  tester_id?: string | null;
  assignee_id?: string | null;
}

export interface DeadlineCalculationResult {
  multiplier: number;
  daysRemaining: number;
  hoursRemaining: number;
  isOverdue: boolean;
  isCriticalWatchlist: boolean;
}

export type ActiveRoleAssignment =
  | { activeRole: 'developer'; userId: string }
  | { activeRole: 'tester'; userId: string }
  | { activeRole: 'unassigned'; userId: null }
  | { activeRole: 'completed'; userId: null };

/**
 * Returns the urgency (priority) multiplier based on task priority level:
 * - Critical / Urgent: 2.0x
 * - High: 1.5x
 * - Medium: 1.0x
 * - Low: 0.5x
 */
export function getUrgencyMultiplier(priority?: string | null): number {
  if (!priority) return URGENCY_MULTIPLIERS.medium;
  const normalized = priority.toLowerCase().trim();
  if (normalized in URGENCY_MULTIPLIERS) {
    return URGENCY_MULTIPLIERS[normalized as keyof typeof URGENCY_MULTIPLIERS];
  }
  return URGENCY_MULTIPLIERS.medium;
}

/**
 * Calculates deadline metrics and multiplier based on remaining time until due_date:
 * - Overdue (< 0 jam / terlewat): 2.0x
 * - Critical Watchlist (<= 72 jam / <= 3 hari): 1.5x
 * - Normal (4 - 7 hari): 1.0x
 * - Jangka Panjang (> 7 hari): 0.7x
 * - Tanpa deadline: 1.0x
 */
export function calculateDeadlineMetrics(
  dueDateStr?: string | null,
  referenceDate: Date = new Date()
): DeadlineCalculationResult {
  if (!dueDateStr) {
    return {
      multiplier: DEADLINE_MULTIPLIERS.no_deadline,
      daysRemaining: Infinity,
      hoursRemaining: Infinity,
      isOverdue: false,
      isCriticalWatchlist: false,
    };
  }

  const targetDate = new Date(dueDateStr);
  if (isNaN(targetDate.getTime())) {
    return {
      multiplier: DEADLINE_MULTIPLIERS.no_deadline,
      daysRemaining: Infinity,
      hoursRemaining: Infinity,
      isOverdue: false,
      isCriticalWatchlist: false,
    };
  }

  // If date-only string (YYYY-MM-DD), count end of that day (23:59:59.999)
  const isDateOnly = dueDateStr.length === 10 && dueDateStr.includes('-');
  const targetTimestamp = isDateOnly
    ? new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        23,
        59,
        59,
        999
      ).getTime()
    : targetDate.getTime();

  const refTimestamp = referenceDate.getTime();
  const diffMs = targetTimestamp - refTimestamp;
  const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));
  const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return {
      multiplier: DEADLINE_MULTIPLIERS.overdue,
      daysRemaining,
      hoursRemaining,
      isOverdue: true,
      isCriticalWatchlist: true,
    };
  }

  // <= 72 hours (3 days)
  if (diffMs <= 72 * 60 * 60 * 1000) {
    return {
      multiplier: DEADLINE_MULTIPLIERS.critical_watchlist,
      daysRemaining,
      hoursRemaining,
      isOverdue: false,
      isCriticalWatchlist: true,
    };
  }

  // 4 - 7 days (7 * 24 hours)
  if (diffMs <= 7 * 24 * 60 * 60 * 1000) {
    return {
      multiplier: DEADLINE_MULTIPLIERS.normal,
      daysRemaining,
      hoursRemaining,
      isOverdue: false,
      isCriticalWatchlist: false,
    };
  }

  // > 7 days
  return {
    multiplier: DEADLINE_MULTIPLIERS.long_term,
    daysRemaining,
    hoursRemaining,
    isOverdue: false,
    isCriticalWatchlist: false,
  };
}

/**
 * Checks whether a task is fully completed:
 * Both development ('dev_done') AND testing ('passed') must be finished,
 * OR the task column indicates completion.
 */
export function isTaskFullyCompleted(task: WorkloadTaskInput): boolean {
  if (task.column_name) {
    const col = task.column_name.toLowerCase();
    if (
      col.includes('done') ||
      col.includes('selesai') ||
      col.includes('complete')
    ) {
      return true;
    }
  }

  return task.dev_status === 'dev_done' && task.test_status === 'passed';
}

/**
 * Determines which role and user is currently bearing the active workload:
 * - Stage 1 (Development): Task assigned to Developer until dev_status === 'dev_done'.
 * - Stage 2 (Testing / QA): Once dev_done, workload shifts to Tester until test_status === 'passed'.
 * - Stage 3 (Selesai): Workload = 0 (completed).
 */
export function determineActiveTaskRole(
  task: WorkloadTaskInput
): ActiveRoleAssignment {
  if (isTaskFullyCompleted(task)) {
    return { activeRole: 'completed', userId: null };
  }

  const devStatus = task.dev_status || 'todo';
  const testStatus = task.test_status || 'pending';

  // If dev is done, workload moves to QA/Tester
  if (devStatus === 'dev_done') {
    if (testStatus !== 'passed') {
      const testerId = task.tester_id || task.assignee_id || null;
      if (testerId) {
        return { activeRole: 'tester', userId: testerId };
      }
      return { activeRole: 'unassigned', userId: null };
    }
    return { activeRole: 'completed', userId: null };
  }

  // Still in development stage
  const devId = task.developer_id || task.assignee_id || null;
  if (devId) {
    return { activeRole: 'developer', userId: devId };
  }

  return { activeRole: 'unassigned', userId: null };
}

/**
 * Calculates dynamic workload points for a task:
 * Formula: Poin Beban = Base Point * Pengali Urgensi * Pengali Sisa Hari
 * If completed -> 0 Poin (frees member capacity immediately).
 */
export function calculateDynamicTaskScore(
  task: WorkloadTaskInput,
  referenceDate: Date = new Date(),
  baseTaskPoints: number = BASE_TASK_LOAD_POINTS
): DynamicTaskScore {
  const roleInfo = determineActiveTaskRole(task);

  if (roleInfo.activeRole === 'completed') {
    return {
      taskId: task.id,
      title: task.title || '',
      priority: task.priority || 'medium',
      dueDate: task.due_date || null,
      urgencyMultiplier: 0,
      deadlineMultiplier: 0,
      calculatedPoints: 0,
      activeRole: 'completed',
      assignedUserId: null,
      isOverdue: false,
      isCriticalWatchlist: false,
    };
  }

  const urgencyMultiplier = getUrgencyMultiplier(task.priority);
  const deadlineMetrics = calculateDeadlineMetrics(
    task.due_date,
    referenceDate
  );

  // Round to 1 decimal place for precision without floating point noise
  const calculatedPoints =
    Math.round(
      baseTaskPoints * urgencyMultiplier * deadlineMetrics.multiplier * 10
    ) / 10;

  return {
    taskId: task.id,
    title: task.title || '',
    priority: task.priority || 'medium',
    dueDate: task.due_date || null,
    urgencyMultiplier,
    deadlineMultiplier: deadlineMetrics.multiplier,
    calculatedPoints,
    activeRole: roleInfo.activeRole,
    assignedUserId: roleInfo.userId,
    isOverdue: deadlineMetrics.isOverdue,
    isCriticalWatchlist: deadlineMetrics.isCriticalWatchlist,
  };
}

/**
 * Calculates Dual-Track multi-tier progress for a collection of tasks (Task -> Project -> Milestone):
 * Syarat mutlak selesai adalah Development (dev_done) DAN Testing (passed) keduanya tuntas.
 */
export function calculateDualTrackProgress(
  tasks: Array<{
    dev_status?: string | null;
    test_status?: string | null;
    column_name?: string | null;
  }>
): DualTrackProgress {
  const totalTasks = tasks.length;
  if (totalTasks === 0) {
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

  let devDoneTasks = 0;
  let testPassedTasks = 0;
  let fullyCompletedTasks = 0;

  for (const t of tasks) {
    const isDevDone = t.dev_status === 'dev_done';
    const isTestPassed = t.test_status === 'passed';
    const isColumnDone = Boolean(
      t.column_name &&
      (t.column_name.toLowerCase().includes('done') ||
        t.column_name.toLowerCase().includes('selesai') ||
        t.column_name.toLowerCase().includes('complete'))
    );

    if (isDevDone || isColumnDone) {
      devDoneTasks++;
    }
    if (isTestPassed || isColumnDone) {
      testPassedTasks++;
    }
    if ((isDevDone && isTestPassed) || isColumnDone) {
      fullyCompletedTasks++;
    }
  }

  return {
    totalTasks,
    devDoneTasks,
    testPassedTasks,
    fullyCompletedTasks,
    devProgress: Math.min(100, Math.round((devDoneTasks / totalTasks) * 100)),
    testProgress: Math.min(
      100,
      Math.round((testPassedTasks / totalTasks) * 100)
    ),
    overallProgress: Math.min(
      100,
      Math.round((fullyCompletedTasks / totalTasks) * 100)
    ),
  };
}

/**
 * Filters and extracts urgent tasks for Critical Watchlist (< 72 Jam / <= 3 Hari):
 * Monitors High & Critical priority tasks nearing or exceeding deadline.
 */
export function extractCriticalWatchlistTasks(
  tasks: Array<
    WorkloadTaskInput & {
      developer?: {
        id: string;
        full_name: string;
        avatar_url: string | null;
      } | null;
      tester?: {
        id: string;
        full_name: string;
        avatar_url: string | null;
      } | null;
      assignee?: {
        id: string;
        full_name: string;
        avatar_url: string | null;
      } | null;
    }
  >,
  referenceDate: Date = new Date()
): CriticalWatchlistTask[] {
  const watchlist: CriticalWatchlistTask[] = [];

  for (const t of tasks) {
    if (isTaskFullyCompleted(t)) continue;
    if (!t.due_date) continue;

    const normalizedPriority = (t.priority || '').toLowerCase().trim();
    if (
      normalizedPriority !== 'high' &&
      normalizedPriority !== 'critical' &&
      normalizedPriority !== 'urgent'
    ) {
      continue;
    }

    const metrics = calculateDeadlineMetrics(t.due_date, referenceDate);
    if (!metrics.isCriticalWatchlist && !metrics.isOverdue) {
      continue;
    }

    const score = calculateDynamicTaskScore(t, referenceDate);
    const roleInfo = determineActiveTaskRole(t);

    let activePIC: CriticalWatchlistTask['activePIC'] = null;
    if (roleInfo.activeRole === 'developer') {
      const u = t.developer || t.assignee;
      if (u) {
        activePIC = {
          id: u.id,
          fullName: u.full_name,
          avatarUrl: u.avatar_url,
          role: 'developer',
        };
      }
    } else if (roleInfo.activeRole === 'tester') {
      const u = t.tester || t.assignee;
      if (u) {
        activePIC = {
          id: u.id,
          fullName: u.full_name,
          avatarUrl: u.avatar_url,
          role: 'tester',
        };
      }
    } else if (t.assignee) {
      activePIC = {
        id: t.assignee.id,
        fullName: t.assignee.full_name,
        avatarUrl: t.assignee.avatar_url,
        role: 'general',
      };
    }

    watchlist.push({
      id: t.id,
      title: t.title || '',
      priority: t.priority || 'high',
      dueDate: t.due_date,
      hoursRemaining: metrics.hoursRemaining,
      daysRemaining: metrics.daysRemaining,
      isOverdue: metrics.isOverdue,
      devStatus:
        (t.dev_status as 'todo' | 'in_progress' | 'dev_done') || 'todo',
      testStatus:
        (t.test_status as 'pending' | 'testing' | 'passed' | 'failed') ||
        'pending',
      activePIC,
      calculatedPoints: score.calculatedPoints,
    });
  }

  // Sort by urgency: overdue tasks first, then closest remaining hours
  return watchlist.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
}
