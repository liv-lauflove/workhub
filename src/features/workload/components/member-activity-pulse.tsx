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
import { Activity, GitCommit, ArrowRightLeft, AlertCircle } from 'lucide-react';
import type {
  ActivityPulseSummary,
  WeeklyActivityPoint,
} from '@/lib/activity-pulse.utils';

interface MemberActivityPulseProps {
  pulse: ActivityPulseSummary;
  activeTaskCount: number;
}

const emptySubscribe = () => () => {};
function useIsMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const MEMBER_PULSE_STYLE: Record<
  ActivityPulseSummary['status'],
  {
    label: string;
    badgeClass: string;
    dotClass: string;
    stroke: string;
    hint: string;
  }
> = {
  active: {
    label: 'Aktif',
    badgeClass:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    dotClass: 'bg-emerald-500 animate-pulse',
    stroke: '#10b981',
    hint: 'Member aktif menggerakkan task atau melakukan commit dalam 7 hari terakhir',
  },
  stagnant: {
    label: 'Stagnan',
    badgeClass:
      'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-500 animate-pulse',
    stroke: '#f59e0b',
    hint: 'Memegang task aktif namun belum tercatat pergerakan atau commit dalam 7 hari terakhir',
  },
  moderate: {
    label: 'Moderat',
    badgeClass:
      'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    dotClass: 'bg-blue-500',
    stroke: '#3b82f6',
    hint: 'Terdapat riwayat aktivitas dalam 2 bulan terakhir dan saat ini tidak memegang task aktif',
  },
  idle: {
    label: 'Idle',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    dotClass: 'bg-muted-foreground/50',
    stroke: '#71717a',
    hint: 'Belum ada aktivitas tercatat dalam 2 bulan terakhir',
  },
};

function MemberPulseTooltip({
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
          <span className="text-muted-foreground">Gerak &amp; QA Task</span>
          <span className="font-semibold text-foreground tabular-nums">
            {point.taskMovements}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Issue Dibuat</span>
          <span className="font-semibold text-foreground tabular-nums">
            {point.tasksCreated}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t pt-1 font-semibold text-foreground">
          <span>Total Detak</span>
          <span className="tabular-nums">{point.total} aksi</span>
        </div>
      </div>
    </div>
  );
}

export function MemberActivityPulse({
  pulse,
  activeTaskCount,
}: MemberActivityPulseProps) {
  const isMounted = useIsMounted();
  const rawId = React.useId();
  const gradientId = `member-pulse-${rawId.replace(/:/g, '')}`;
  const cfg = MEMBER_PULSE_STYLE[pulse.status] || MEMBER_PULSE_STYLE.idle;

  return (
    <div className="mt-3.5 pt-3 border-t border-border/60 space-y-2">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
          <Activity className="h-3 w-3 text-primary shrink-0" />
          <span>Detak Kegiatan (8 Mgg)</span>
        </span>

        <div className="flex items-center gap-1.5" title={cfg.hint}>
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
      <div className="h-14 w-full rounded-lg border border-border/50 bg-muted/20 px-1.5 pt-1">
        {!isMounted ? (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
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
                  return <MemberPulseTooltip active={active} point={point} />;
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

      {/* Breakdown or Stagnant Callout Strip */}
      {pulse.status === 'stagnant' && activeTaskCount > 0 ? (
        <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate">
            Ada {activeTaskCount} task aktif tanpa pergerakan 7 hari terakhir
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground px-0.5">
          <div className="inline-flex items-center gap-1">
            <GitCommit className="h-3 w-3 text-emerald-500 shrink-0" />
            <span className="tabular-nums">{pulse.totalCommits} commit</span>
          </div>

          <div className="inline-flex items-center gap-1">
            <ArrowRightLeft className="h-3 w-3 text-sky-500 shrink-0" />
            <span className="tabular-nums">
              {pulse.totalTaskMovements} gerak task
            </span>
          </div>

          <span className="font-medium text-foreground tabular-nums">
            {pulse.recentWeekEvents} mgg ini
          </span>
        </div>
      )}
    </div>
  );
}
