import { OVERLOAD_THRESHOLD } from '@/lib/constants';

export function calculateCapacity(
  totalWeight: number,
  baselinePoints: number
): number {
  if (baselinePoints <= 0) return 0;
  return Math.round((totalWeight / baselinePoints) * 100);
}

export function isOverloaded(capacityPercent: number): boolean {
  return capacityPercent > OVERLOAD_THRESHOLD;
}
