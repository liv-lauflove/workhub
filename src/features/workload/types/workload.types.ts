/**
 * Workload and capacity types and constants.
 * Implements PRD §9.6, Issue #28, and Issue #95 (Dual-Track Progress & Dynamic Workload Engine).
 */

/**
 * Static weight mapping for task priorities (Issue #28 fallback).
 * High (3 points), Medium (2 points), Low (1 point), Critical/Urgent (4 points).
 */
export const PRIORITY_WEIGHTS = {
  critical: 4,
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

export type PriorityLevel = keyof typeof PRIORITY_WEIGHTS;

/** Default baseline capacity points per team if not configured */
export const DEFAULT_BASELINE_POINTS = 20;

/**
 * Base task load points for standard Medium priority task with normal deadline (Issue #95).
 */
export const BASE_TASK_LOAD_POINTS = 2.0;

/**
 * Dynamic Urgency (Priority) Multipliers (Issue #95):
 * - Critical / Urgent: 2.0x
 * - High: 1.5x
 * - Medium: 1.0x
 * - Low: 0.5x
 */
export const URGENCY_MULTIPLIERS = {
  critical: 2.0,
  urgent: 2.0,
  high: 1.5,
  medium: 1.0,
  low: 0.5,
} as const;

/**
 * Dynamic Deadline Multipliers based on remaining time (Issue #95):
 * - Overdue (< 0 hari / terlewat): 2.0x
 * - Critical Watchlist (<= 3 hari / <= 72 jam): 1.5x
 * - Normal (4 - 7 hari): 1.0x
 * - Jangka Panjang (> 7 hari): 0.7x
 * - Tanpa deadline: 1.0x
 */
export const DEADLINE_MULTIPLIERS = {
  overdue: 2.0,
  critical_watchlist: 1.5,
  normal: 1.0,
  long_term: 0.7,
  no_deadline: 1.0,
} as const;

/** Summary count of tasks breakdown by priority */
export interface MemberWorkloadTaskSummary {
  urgentCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

/** Individual team member workload calculation result */
export interface MemberWorkload {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  teamId: string;
  activeTaskCount: number;
  totalWeight: number;
  baselinePoints: number;
  capacityPercentage: number;
  isOverloaded: boolean;
  tasksSummary: MemberWorkloadTaskSummary;
  /** Detailed dynamic breakdown per task (Issue #95) */
  dynamicTasks?: DynamicTaskScore[];
}

/** Aggregate team workload and capacity overview */
export interface TeamWorkloadSummary {
  teamId: string;
  teamName: string;
  baselinePoints: number;
  totalActiveTasks: number;
  totalTeamWeight: number;
  teamCapacityPercentage: number;
  overloadedMembersCount: number;
  members: MemberWorkload[];
}

/**
 * Calculated dynamic score item for a single task (Issue #95)
 */
export interface DynamicTaskScore {
  taskId: string;
  title: string;
  priority: string;
  dueDate: string | null;
  urgencyMultiplier: number;
  deadlineMultiplier: number;
  calculatedPoints: number;
  activeRole: 'developer' | 'tester' | 'unassigned' | 'completed';
  assignedUserId: string | null;
  isOverdue: boolean;
  isCriticalWatchlist: boolean;
}

/**
 * Dual-Track Multi-Tier Progress Calculation Result (Issue #95):
 * Syarat mutlak selesai adalah Development (dev_done) DAN Testing (passed) keduanya tuntas.
 */
export interface DualTrackProgress {
  totalTasks: number;
  devDoneTasks: number;
  testPassedTasks: number;
  fullyCompletedTasks: number;
  /** Development track progress percentage (0 - 100%) */
  devProgress: number;
  /** QA / Testing track progress percentage (0 - 100%) */
  testProgress: number;
  /** Overall combined progress where both dev and test are completed (0 - 100%) */
  overallProgress: number;
}

/**
 * Critical Watchlist item for tasks with deadline <= 72 hours (Issue #95 / #96)
 */
export interface CriticalWatchlistTask {
  id: string;
  title: string;
  priority: string;
  dueDate: string;
  hoursRemaining: number;
  daysRemaining: number;
  isOverdue: boolean;
  devStatus: 'todo' | 'in_progress' | 'dev_done';
  testStatus: 'pending' | 'testing' | 'passed' | 'failed';
  activePIC?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    role: 'developer' | 'tester' | 'general';
  } | null;
  calculatedPoints: number;
}
