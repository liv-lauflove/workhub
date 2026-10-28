import type { MemberWorkload } from '@/features/workload/types/workload.types';

export type AvailabilityStatus = 'AVAILABLE' | 'NORMAL' | 'OVERLOAD';

/**
 * Evaluates a team member's availability status based on their dynamic capacity points,
 * overload status, and active task count.
 *
 * Policies (hasil-meet.md & Issue #97):
 * - OVERLOAD: When capacityPercentage > 80% or marked overloaded by workload engine.
 * - AVAILABLE: When capacityPercentage < 50% and activeTaskCount <= 2 (ideal for new assignments).
 * - NORMAL: When capacity is between 50% and 80%.
 */
export function determineAvailabilityStatus(
  member: MemberWorkload
): AvailabilityStatus {
  if (member.isOverloaded || member.capacityPercentage > 80) {
    return 'OVERLOAD';
  }
  if (member.capacityPercentage < 50 && member.activeTaskCount <= 2) {
    return 'AVAILABLE';
  }
  return 'NORMAL';
}
