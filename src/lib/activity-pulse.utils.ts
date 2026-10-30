export interface WeeklyActivityPoint {
  period: string;
  fullLabel: string;
  commits: number;
  tasksCreated: number;
  taskMovements: number;
  total: number;
}

export type ActivityPulseStatus = 'active' | 'moderate' | 'stagnant' | 'idle';

export interface ActivityPulseSummary {
  points: WeeklyActivityPoint[];
  totalEvents: number;
  totalCommits: number;
  totalTasksCreated: number;
  totalTaskMovements: number;
  recentWeekEvents: number;
  status: ActivityPulseStatus;
  lastActiveAt: string | null;
}

export interface ActivityPulseInput {
  commitTimestamps: string[];
  taskCreatedTimestamps: string[];
  taskMovementTimestamps: string[];
  activeTaskCount?: number;
  mode?: 'project' | 'member';
  numberOfWeeks?: number;
  referenceDate?: Date;
}

function formatShortIdDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

function parseValidTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Aggregates raw timestamps (commits, task creations, and task movements)
 * over the past 8 weeks (~2 months) into weekly pulse buckets.
 */
export function buildActivityPulse(
  input: ActivityPulseInput
): ActivityPulseSummary {
  const numberOfWeeks = input.numberOfWeeks ?? 8;
  const referenceDate = input.referenceDate ?? new Date();
  const mode = input.mode ?? 'project';
  const activeTaskCount = input.activeTaskCount ?? 0;

  const commitTimes = input.commitTimestamps
    .map(parseValidTimestamp)
    .filter((t): t is number => t !== null);
  const createdTimes = input.taskCreatedTimestamps
    .map(parseValidTimestamp)
    .filter((t): t is number => t !== null);
  const movementTimes = input.taskMovementTimestamps
    .map(parseValidTimestamp)
    .filter((t): t is number => t !== null);

  const allTimes = [...commitTimes, ...createdTimes, ...movementTimes];
  const latestMs = allTimes.length > 0 ? Math.max(...allTimes) : null;
  const lastActiveAt = latestMs ? new Date(latestMs).toISOString() : null;

  const points: WeeklyActivityPoint[] = [];
  let totalCommits = 0;
  let totalTasksCreated = 0;
  let totalTaskMovements = 0;

  for (let i = numberOfWeeks - 1; i >= 0; i--) {
    const end = new Date(referenceDate);
    end.setDate(referenceDate.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const startMs = start.getTime();
    const endMs = end.getTime();
    const weekNumber = numberOfWeeks - i;

    const commits = commitTimes.filter(
      (t) => t >= startMs && t <= endMs
    ).length;
    const tasksCreated = createdTimes.filter(
      (t) => t >= startMs && t <= endMs
    ).length;
    const taskMovements = movementTimes.filter(
      (t) => t >= startMs && t <= endMs
    ).length;
    const total = commits + tasksCreated + taskMovements;

    totalCommits += commits;
    totalTasksCreated += tasksCreated;
    totalTaskMovements += taskMovements;

    points.push({
      period: `Mgg ${weekNumber}`,
      fullLabel: `Minggu ${weekNumber} (${formatShortIdDate(start)} - ${formatShortIdDate(end)})`,
      commits,
      tasksCreated,
      taskMovements,
      total,
    });
  }

  const totalEvents = totalCommits + totalTasksCreated + totalTaskMovements;
  const recentWeekEvents = points[points.length - 1]?.total ?? 0;

  let status: ActivityPulseStatus = 'idle';
  if (recentWeekEvents > 0) {
    status = 'active';
  } else if (mode === 'member' && activeTaskCount > 0) {
    status = 'stagnant';
  } else if (totalEvents > 0) {
    status = 'moderate';
  } else {
    status = 'idle';
  }

  return {
    points,
    totalEvents,
    totalCommits,
    totalTasksCreated,
    totalTaskMovements,
    recentWeekEvents,
    status,
    lastActiveAt,
  };
}
