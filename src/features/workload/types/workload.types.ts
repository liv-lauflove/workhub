/**
 * Workload and capacity types and constants.
 */

/**
 * Static weight mapping for task priorities (PRD §9.6, Issue #28).
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
