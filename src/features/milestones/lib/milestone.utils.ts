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
 * Safely parses year, month, day to prevent timezone date shifting.
 */
export function formatMilestoneDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, monthIndex, day);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
    }
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

  const startParts = startDateStr.split('-').map(Number);
  const targetParts = targetDateStr.split('-').map(Number);

  const start = new Date(
    startParts[0] || 0,
    (startParts[1] || 1) - 1,
    startParts[2] || 1
  ).getTime();
  const target = new Date(
    targetParts[0] || 0,
    (targetParts[1] || 1) - 1,
    targetParts[2] || 1
  ).getTime();

  // Normalize current date to midnight for consistent day difference
  const now = new Date();
  const currentTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

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
