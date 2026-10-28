'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { OVERLOAD_THRESHOLD } from '@/lib/constants';

interface CapacityMeterProps {
  percentage: number;
  totalWeight?: number;
  baselinePoints?: number;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Returns color classes and status text based on capacity percentage:
 * - > 80%: Critical / Overload (Red / Rose) with AlertTriangle icon
 * - 70% - 80%: Approaching limit / Warning (Amber)
 * - < 70%: Normal / Optimal (Emerald)
 */
function getCapacityStatus(percentage: number) {
  if (percentage > OVERLOAD_THRESHOLD) {
    return {
      status: 'overload' as const,
      label: 'Overload',
      barColor: 'bg-rose-500 dark:bg-rose-500',
      trackColor: 'bg-rose-500/20 dark:bg-rose-500/20',
      textColor: 'text-rose-600 dark:text-rose-400',
      badgeClass:
        'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
      icon: AlertTriangle,
    };
  }

  if (percentage >= 70) {
    return {
      status: 'warning' as const,
      label: 'Mendekati Batas',
      barColor: 'bg-amber-500 dark:bg-amber-500',
      trackColor: 'bg-amber-500/20 dark:bg-amber-500/20',
      textColor: 'text-amber-600 dark:text-amber-400',
      badgeClass:
        'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      icon: AlertCircle,
    };
  }

  return {
    status: 'optimal' as const,
    label: 'Optimal',
    barColor: 'bg-emerald-500 dark:bg-emerald-500',
    trackColor: 'bg-muted dark:bg-muted/80',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    badgeClass:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
  };
}

export function CapacityMeter({
  percentage,
  totalWeight,
  baselinePoints,
  showDetails = true,
  size = 'md',
  className = '',
}: CapacityMeterProps) {
  const isOverloaded = percentage > OVERLOAD_THRESHOLD;
  const statusConfig = getCapacityStatus(percentage);
  const StatusIcon = statusConfig.icon;

  // Clamp bar width between 0% and 100% for progress bar rendering
  const clampedWidth = Math.min(Math.max(percentage, 0), 100);

  const heightClass =
    size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3.5' : 'h-2.5';

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {/* 1. Header Information: Percentage & Overload Warning */}
      {showDetails && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-bold transition-colors ${statusConfig.textColor}`}
            >
              {percentage}%
            </span>
            {totalWeight !== undefined && baselinePoints !== undefined && (
              <span className="text-muted-foreground text-[11px]">
                ({totalWeight} / {baselinePoints} pts)
              </span>
            )}
          </div>

          {/* Overload / Status Badge */}
          <div
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold transition-all ${statusConfig.badgeClass} ${
              isOverloaded ? 'animate-pulse' : ''
            }`}
          >
            <StatusIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{statusConfig.label}</span>
          </div>
        </div>
      )}

      {/* 2. Visual Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Kapasitas kerja: ${percentage}%, status: ${statusConfig.label}`}
        className={`w-full overflow-hidden rounded-full bg-muted/60 ${heightClass} ${statusConfig.trackColor}`}
      >
        <div
          style={{ width: `${clampedWidth}%` }}
          className={`h-full rounded-full transition-all duration-500 ease-out ${statusConfig.barColor}`}
        />
      </div>
    </div>
  );
}
