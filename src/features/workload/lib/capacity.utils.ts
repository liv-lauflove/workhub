import { OVERLOAD_THRESHOLD } from '@/lib/constants';
import {
  PRIORITY_WEIGHTS,
  type MemberWorkloadTaskSummary,
} from '../types/workload.types';

/**
 * Returns the numeric weight for a given task priority.
 * Default mapping:
 * - High: 3 points
 * - Medium: 2 points
 * - Low: 1 point
 * - Critical / Urgent: 4 points
 * - Fallback: 1 point
 */
export function getTaskWeight(priority?: string | null): number {
  if (!priority) return PRIORITY_WEIGHTS.medium;
  const normalized = priority.toLowerCase().trim();
  if (normalized in PRIORITY_WEIGHTS) {
    return PRIORITY_WEIGHTS[normalized as keyof typeof PRIORITY_WEIGHTS];
  }
  return 1;
}

/**
 * Checks whether a column represents an active (In Progress / Open) task.
 * Returns false if the column indicates completion (Done, Selesai, Complete).
 */
export function isTaskActive(columnName?: string | null): boolean {
  if (!columnName) return true;
  const lower = columnName.toLowerCase();
  return !(
    lower.includes('done') ||
    lower.includes('complete') ||
    lower.includes('selesai')
  );
}

/**
 * Calculates the capacity percentage:
 * (Total Active Task Weight / Baseline Points) * 100
 * Safely guards against non-positive baseline points.
 */
export function calculateCapacity(
  totalWeight: number,
  baselinePoints: number
): number {
  if (baselinePoints <= 0) return 0;
  return Math.round((totalWeight / baselinePoints) * 100);
}

/**
 * Checks whether a member is overloaded based on threshold (> 80%).
 */
export function isOverloaded(capacityPercent: number): boolean {
  return capacityPercent > OVERLOAD_THRESHOLD;
}

export interface TaskLike {
  priority?: string | null;
  column_name?: string | null;
}

/**
 * Computes the aggregate metrics for a collection of active tasks assigned to a member.
 */
export function calculateTasksWorkload(tasks: TaskLike[]): {
  activeTaskCount: number;
  totalWeight: number;
  tasksSummary: MemberWorkloadTaskSummary;
} {
  const summary: MemberWorkloadTaskSummary = {
    urgentCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
  };

  let totalWeight = 0;
  let activeTaskCount = 0;

  for (const task of tasks) {
    // Only count active (non-done) tasks
    if (task.column_name !== undefined && !isTaskActive(task.column_name)) {
      continue;
    }

    activeTaskCount++;
    const weight = getTaskWeight(task.priority);
    totalWeight += weight;

    const normalizedPriority = (task.priority || 'medium').toLowerCase().trim();
    if (normalizedPriority === 'critical' || normalizedPriority === 'urgent') {
      summary.urgentCount++;
    } else if (normalizedPriority === 'high') {
      summary.highCount++;
    } else if (normalizedPriority === 'medium') {
      summary.mediumCount++;
    } else {
      summary.lowCount++;
    }
  }

  return {
    activeTaskCount,
    totalWeight,
    tasksSummary: summary,
  };
}
