'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Activity, GitCommit, PlusCircle, ArrowRightLeft } from 'lucide-react';
import type {
  ActivityPulseSummary,
  WeeklyActivityPoint,
} from '@/lib/activity-pulse.utils';

interface ProjectActivityPulseProps {
  pulse: ActivityPulseSummary;
}

const emptySubscribe = () => () => {};
function useIsMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const PULSE_STATUS_STYLE: Record<
  ActivityPulseSummary['status'],
  {
    label: string;
    badgeClass: string;
    dotClass: string;
    stroke: string;
  }
> = {
  active: {
    label: 'Aktif',
    badgeClass:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    dotClass: 'bg-emerald-500 animate-pulse',
    stroke: '#10b981',
  },
  moderate: {
    label: 'Moderat',
    badgeClass:
      'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    dotClass: 'bg-blue-500',
    stroke: '#3b82f6',
  },
  stagnant: {
    label: 'Stagnan',
    badgeClass:
      'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-500',
    stroke: '#f59e0b',
  },
  idle: {
    label: 'Pasif',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    dotClass: 'bg-muted-foreground/50',
    stroke: '#71717a',
  },
};

function ProjectPulseTooltip({
  active,
  point,
}: {
  active?: boolean;
  point?: WeeklyActivityPoint;
}) {
  if (!active || !point) return null;

  return (
    <div className="rounded-lg border bg-popover/95 p-2.5 text-[11px] text-popover-foreground shadow-lg backdrop-blur-md ring-1 ring-border min-w-[165px] space-y-1.5">
      <div className="border-b pb-1 font-semibold text-foreground">
        {point.fullLabel}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Commit GitHub</span>
          <span className="font-semibold text-foreground tabular-nums">
            {point.commits}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Issue Baru</span>
          <span className="font-semibold text-foreground tabular-nums">
            {point.tasksCreated}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Gerak Task</span>
          <span className="font-semibold text-foreground tabular-nums">
            {point.taskMovements}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t pt-1 font-semibold text-foreground">
          <span>Total Aktivitas</span>
          <span className="tabular-nums">{point.total} aksi</span>
        </div>
      </div>
    </div>
  );
}

export function ProjectActivityPulse({ pulse }: ProjectActivityPulseProps) {
  const isMounted = useIsMounted();
  const rawId = React.useId();
  const gradientId = `project-pulse-${rawId.replace(/:/g, '')}`;
  const cfg = PULSE_STATUS_STYLE[pulse.status] || PULSE_STATUS_STYLE.idle;

  return (
    <div
      className="rounded-lg border border-border/70 bg-muted/25 p-2.5 space-y-2"
      onClick={(e) => {
        // Allow hovering/interacting with tooltip without accidental text selection issues
        e.stopPropagation();
      }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Detak Aktivitas (8 Mgg)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
            {pulse.totalEvents} aksi
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[10px] font-semibold ${cfg.badgeClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
            <span>{cfg.label}</span>
          </span>
        </div>
      </div>

      {/* Wave Chart Area */}
      <div className="h-14 w-full">
        {!isMounted ? (
          <div className="flex h-full w-full items-center justify-center rounded bg-muted/30 text-[10px] text-muted-foreground">
            Memuat detak...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={pulse.points}
              margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cfg.stroke} stopOpacity={0.35} />
                  <stop
                    offset="95%"
                    stopColor={cfg.stroke}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <XAxis dataKey="period" hide />
              <YAxis hide domain={[0, 'dataMax + 1']} />
              <Tooltip
                cursor={{
                  stroke: cfg.stroke,
                  strokeWidth: 1,
                  strokeDasharray: '2 2',
                }}
                content={({ active, label }) => {
                  const point = pulse.points.find(
                    (p) => p.period === String(label)
                  );
                  return <ProjectPulseTooltip active={active} point={point} />;
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={cfg.stroke}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={{ r: 2, fill: cfg.stroke, strokeWidth: 0 }}
                activeDot={{ r: 3.5, strokeWidth: 1.5, fill: cfg.stroke }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Breakdown Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
        <div
          className="inline-flex items-center gap-1"
          title="Total commit GitHub (2 bulan terakhir)"
        >
          <GitCommit className="h-3 w-3 text-emerald-500 shrink-0" />
          <span className="tabular-nums">{pulse.totalCommits} commit</span>
        </div>

        <div
          className="inline-flex items-center gap-1"
          title="Total pembuatan issue/task baru (2 bulan terakhir)"
        >
          <PlusCircle className="h-3 w-3 text-sky-500 shrink-0" />
          <span className="tabular-nums">{pulse.totalTasksCreated} issue</span>
        </div>

        <div
          className="inline-flex items-center gap-1"
          title="Total pergerakan kolom, status, & checklist task (2 bulan terakhir)"
        >
          <ArrowRightLeft className="h-3 w-3 text-amber-500 shrink-0" />
          <span className="tabular-nums">{pulse.totalTaskMovements} gerak</span>
        </div>
      </div>
    </div>
  );
}
