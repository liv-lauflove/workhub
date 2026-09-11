/**
 * Utility functions for Milestone calculations and formatting.
 */

export interface MilestoneProgressInfo {
  percentage: number;
  daysRemaining: number;
  totalDays: number;
  daysPassed: number;
  isOverdue: boolean;
  isUpcoming: boolean;
  formattedStartDate: string;
  formattedTargetDate: string;
  statusText: string;
}

/**
 * Format ISO date string (YYYY-MM-DD) to Indonesian localized date.
 */
export function formatMilestoneDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Calculates rough elapsed time percentage for a milestone.
 * Used for visual progress bar tracking milestone schedule.
 */
export function calculateMilestoneTimeProgress(
  startDateStr: string,
  targetDateStr: string,
  status?: string
): MilestoneProgressInfo {
  const formattedStartDate = formatMilestoneDate(startDateStr);
  const formattedTargetDate = formatMilestoneDate(targetDateStr);

  // If milestone is marked completed, progress is 100%
  if (status === 'completed') {
    return {
      percentage: 100,
      daysRemaining: 0,
      totalDays: 0,
      daysPassed: 0,
      isOverdue: false,
      isUpcoming: false,
      formattedStartDate,
      formattedTargetDate,
      statusText: 'Selesai',
    };
  }

  const start = new Date(startDateStr).getTime();
  const target = new Date(targetDateStr).getTime();
  // Normalize current date to midnight for accurate day difference
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentTime = now.getTime();

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(1, Math.round((target - start) / MS_PER_DAY));
  const daysPassed = Math.round((currentTime - start) / MS_PER_DAY);
  const daysRemaining = Math.round((target - currentTime) / MS_PER_DAY);

  const isUpcoming = currentTime < start;
  const isOverdue = currentTime > target;

  let percentage = 0;
  let statusText = '';

  if (isUpcoming) {
    percentage = 0;
    statusText = `Dimulai dalam ${Math.abs(daysPassed)} hari`;
  } else if (isOverdue) {
    percentage = 100;
    statusText = `Lewat ${Math.abs(daysRemaining)} hari`;
  } else {
    percentage = Math.min(
      100,
      Math.max(0, Math.round((daysPassed / totalDays) * 100))
    );
    if (daysRemaining === 0) {
      statusText = 'Berakhir hari ini';
    } else {
      statusText = `Sisa ${daysRemaining} hari lagi`;
    }
  }

  return {
    percentage,
    daysRemaining,
    totalDays,
    daysPassed,
    isOverdue,
    isUpcoming,
    formattedStartDate,
    formattedTargetDate,
    statusText,
  };
}
