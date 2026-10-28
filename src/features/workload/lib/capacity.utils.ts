import { OVERLOAD_THRESHOLD } from '@/lib/constants';
import {
  PRIORITY_WEIGHTS,
  type MemberWorkloadTaskSummary,
  type DynamicTaskScore,
} from '../types/workload.types';
import {
  calculateDynamicTaskScore,
  isTaskFullyCompleted,
  type WorkloadTaskInput,
} from './workload-engine';

export * from './workload-engine';

/**
 * Returns the numeric weight for a given task priority (Static fallback).
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
 * (Total Task Weight / Baseline Points) * 100
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
  id?: string;
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

/**
 * Computes dynamic workload metrics for tasks assigned to a specific member (Issue #95).
 */
export function calculateMemberDynamicWorkload(
  memberId: string,
  tasks: TaskLike[],
  referenceDate: Date = new Date()
): {
  activeTaskCount: number;
  totalWeight: number;
  tasksSummary: MemberWorkloadTaskSummary;
  dynamicTasks: DynamicTaskScore[];
} {
  const summary: MemberWorkloadTaskSummary = {
    urgentCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
  };

  let totalWeight = 0;
  let activeTaskCount = 0;
  const dynamicTasks: DynamicTaskScore[] = [];

  for (const task of tasks) {
    const inputTask: WorkloadTaskInput = {
      id: task.id || '',
      title: task.title,
      priority: task.priority,
      due_date: task.due_date,
      column_name: task.column_name,
      dev_status: task.dev_status,
      test_status: task.test_status,
      developer_id: task.developer_id,
      tester_id: task.tester_id,
      assignee_id: task.assignee_id,
    };

    if (isTaskFullyCompleted(inputTask)) {
      continue;
    }

    const score = calculateDynamicTaskScore(inputTask, referenceDate);

    // Only count if this member is currently the active role PIC
    if (score.assignedUserId !== memberId) {
      continue;
    }

    activeTaskCount++;
    totalWeight += score.calculatedPoints;
    dynamicTasks.push(score);

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
    totalWeight: Math.round(totalWeight * 10) / 10,
    tasksSummary: summary,
    dynamicTasks,
  };
}

/**
 * Legacy static workload computation (PRD §9.6 / Issue #28 fallback).
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
