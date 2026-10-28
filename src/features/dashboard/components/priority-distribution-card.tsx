'use client';

import * as React from 'react';
import { Flame, AlertCircle, Clock, ShieldCheck, PieChart } from 'lucide-react';
import type { PriorityDistribution } from '../types/dashboard.types';

interface PriorityDistributionCardProps {
  distribution: PriorityDistribution;
}

export function PriorityDistributionCard({
  distribution,
}: PriorityDistributionCardProps) {
  const total = Math.max(distribution.total, 1);

  const urgentPct = Math.round((distribution.urgent / total) * 100);
  const highPct = Math.round((distribution.high / total) * 100);
  const mediumPct = Math.round((distribution.medium / total) * 100);
  const lowPct = Math.round((distribution.low / total) * 100);

  const priorities = [
    {
      label: 'Critical / Urgent',
      count: distribution.urgent,
      percentage: urgentPct,
      color: 'bg-rose-500',
      badgeClass:
        'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
      icon: Flame,
    },
    {
      label: 'High Priority',
      count: distribution.high,
      percentage: highPct,
      color: 'bg-orange-500',
      badgeClass:
        'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
      icon: AlertCircle,
    },
    {
      label: 'Medium Priority',
      count: distribution.medium,
      percentage: mediumPct,
      color: 'bg-sky-500',
      badgeClass:
        'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
      icon: Clock,
    },
    {
      label: 'Low Priority',
      count: distribution.low,
      percentage: lowPct,
      color: 'bg-slate-400 dark:bg-slate-500',
      badgeClass: 'bg-muted text-muted-foreground border-border',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <PieChart className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold tracking-tight text-foreground">
              Distribusi Prioritas
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {distribution.total} Total Task
          </span>
        </div>

        {/* Priority Item Bars */}
        <div className="mt-4 space-y-3.5">
          {priorities.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-semibold text-foreground truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground">
                      {item.count} task
                    </span>
                    <span className="font-bold text-foreground text-xs min-w-[32px] text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary note */}
      <div className="mt-5 pt-3 border-t text-[11px] text-muted-foreground leading-relaxed">
        {distribution.urgent > 0 ? (
          <span className="text-rose-600 dark:text-rose-400 font-medium">
            Terdapat {distribution.urgent} task urgent yang memerlukan perhatian
            intensif tim.
          </span>
        ) : (
          <span>
            Distribusi beban prioritas terdistribusi secara seimbang antar
            level.
          </span>
        )}
      </div>
    </div>
  );
}
