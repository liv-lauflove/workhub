/**
 * Utility functions for computing time-series task completion trends (PRD §9.5, Issue #31).
 */

import { isTaskActive } from '@/features/workload/lib/capacity.utils';
import type {
  CompletionTrendPoint,
  CompletionTrendData,
} from '../types/dashboard.types';

export interface TaskTrendInput {
  id: string;
  createdAt: string;
  updatedAt?: string | null;
  columnName?: string | null;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Calculates weekly task completion trend for the last N weeks.
 * Aggregates:
 * - completed: tasks moved to Done status within each week
 * - created: tasks created within each week
 * - cumulativeCompleted: running total of completed tasks
 * - target: projected linear completion line
 */
export function calculateWeeklyTrends(
  tasks: TaskTrendInput[],
  totalTasksCount: number,
  numberOfWeeks = 8,
  referenceDate: Date = new Date()
): CompletionTrendPoint[] {
  const result: CompletionTrendPoint[] = [];
  let runningCumulative = 0;

  // Generate week intervals ending at referenceDate
  const intervals: {
    period: string;
    fullLabel: string;
    startDate: Date;
    endDate: Date;
  }[] = [];

  for (let i = numberOfWeeks - 1; i >= 0; i--) {
    const end = new Date(referenceDate);
    end.setDate(referenceDate.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const weekIndex = numberOfWeeks - i;
    intervals.push({
      period: `Mgg ${weekIndex}`,
      fullLabel: `Minggu ${weekIndex} (${formatDateShort(start)} – ${formatDateShort(end)})`,
      startDate: start,
      endDate: end,
    });
  }

  // Pre-calculate completed tasks before the first interval for initial cumulative count
  const firstIntervalStart = intervals[0]?.startDate.getTime() || 0;
  for (const task of tasks) {
    const isDone = !isTaskActive(task.columnName);
    if (!isDone) continue;

    const taskDate = new Date(task.updatedAt || task.createdAt).getTime();
    if (taskDate < firstIntervalStart) {
      runningCumulative++;
    }
  }

  for (let idx = 0; idx < intervals.length; idx++) {
    const interval = intervals[idx];
    const startTime = interval.startDate.getTime();
    const endTime = interval.endDate.getTime();

    let completedInInterval = 0;
    let createdInInterval = 0;

    for (const task of tasks) {
      const isDone = !isTaskActive(task.columnName);
      const updateTime = new Date(task.updatedAt || task.createdAt).getTime();
      const createTime = new Date(task.createdAt).getTime();

      if (isDone && updateTime >= startTime && updateTime <= endTime) {
        completedInInterval++;
      }

      if (createTime >= startTime && createTime <= endTime) {
        createdInInterval++;
      }
    }

    runningCumulative += completedInInterval;

    // Projected target pace (linear progression towards total tasks)
    const target = Math.round(
      (Math.max(totalTasksCount, 1) / numberOfWeeks) * (idx + 1)
    );

    result.push({
      period: interval.period,
      fullLabel: interval.fullLabel,
      completed: completedInInterval,
      created: createdInInterval,
      cumulativeCompleted: runningCumulative,
      target,
    });
  }

  return result;
}

/**
 * Calculates monthly task completion trend (e.g. 4 months covering the quarter).
 */
export function calculateMonthlyTrends(
  tasks: TaskTrendInput[],
  totalTasksCount: number,
  numberOfMonths = 4,
  referenceDate: Date = new Date()
): CompletionTrendPoint[] {
  const result: CompletionTrendPoint[] = [];
  let runningCumulative = 0;

  const intervals: {
    period: string;
    fullLabel: string;
    startDate: Date;
    endDate: Date;
  }[] = [];

  for (let i = numberOfMonths - 1; i >= 0; i--) {
    const d = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - i,
      1
    );
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthLabel = start.toLocaleDateString('id-ID', { month: 'short' });
    const fullLabel = start.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });

    intervals.push({
      period: monthLabel,
      fullLabel,
      startDate: start,
      endDate: end,
    });
  }

  // Pre-calculate completed tasks before the first month
  const firstMonthStart = intervals[0]?.startDate.getTime() || 0;
  for (const task of tasks) {
    const isDone = !isTaskActive(task.columnName);
    if (!isDone) continue;

    const taskDate = new Date(task.updatedAt || task.createdAt).getTime();
    if (taskDate < firstMonthStart) {
      runningCumulative++;
    }
  }

  for (let idx = 0; idx < intervals.length; idx++) {
    const interval = intervals[idx];
    const startTime = interval.startDate.getTime();
    const endTime = interval.endDate.getTime();

    let completedInInterval = 0;
    let createdInInterval = 0;

    for (const task of tasks) {
      const isDone = !isTaskActive(task.columnName);
      const updateTime = new Date(task.updatedAt || task.createdAt).getTime();
      const createTime = new Date(task.createdAt).getTime();

      if (isDone && updateTime >= startTime && updateTime <= endTime) {
        completedInInterval++;
      }

      if (createTime >= startTime && createTime <= endTime) {
        createdInInterval++;
      }
    }

    runningCumulative += completedInInterval;

    const target = Math.round(
      (Math.max(totalTasksCount, 1) / numberOfMonths) * (idx + 1)
    );

    result.push({
      period: interval.period,
      fullLabel: interval.fullLabel,
      completed: completedInInterval,
      created: createdInInterval,
      cumulativeCompleted: runningCumulative,
      target,
    });
  }

  return result;
}

/**
 * Builds the complete time-series trend dataset for the dashboard.
 */
export function buildCompletionTrendData(
  tasks: TaskTrendInput[],
  totalTasksCount: number,
  referenceDate: Date = new Date()
): CompletionTrendData {
  const weekly = calculateWeeklyTrends(
    tasks,
    totalTasksCount,
    8,
    referenceDate
  );
  const monthly = calculateMonthlyTrends(
    tasks,
    totalTasksCount,
    4,
    referenceDate
  );

  const totalCompleted = tasks.filter(
    (t) => !isTaskActive(t.columnName)
  ).length;

  const weeklySum = weekly.reduce((acc, p) => acc + p.completed, 0);
  const weeklyAverage =
    Math.round((weeklySum / Math.max(weekly.length, 1)) * 10) / 10;

  const latestCumulative = weekly[weekly.length - 1]?.cumulativeCompleted || 0;
  const latestTarget = weekly[weekly.length - 1]?.target || 1;
  const targetPaceAchieved = latestCumulative >= latestTarget * 0.8;

  const completionVelocity =
    totalTasksCount > 0
      ? Math.round((totalCompleted / totalTasksCount) * 100)
      : 0;

  return {
    weekly,
    monthly,
    summary: {
      totalCompleted,
      weeklyAverage,
      completionVelocity,
      targetPaceAchieved,
    },
  };
}
