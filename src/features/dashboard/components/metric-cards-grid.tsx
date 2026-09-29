'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Layers,
  FolderKanban,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import type { DashboardMetrics } from '../types/dashboard.types';
import { ROUTES } from '@/config/routes';

interface MetricCardsGridProps {
  metrics: DashboardMetrics;
  urgentAndHighCount?: number;
}

export function MetricCardsGrid({
  metrics,
  urgentAndHighCount = 0,
}: MetricCardsGridProps) {
  const hasOverload = metrics.overloadedMembersCount > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Completion Rate */}
      <div className="group relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md hover:border-primary/40">
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Tingkat Penyelesaian</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {metrics.completionRate}%
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              Rasio Selesai
            </span>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.completedTasks} selesai dari {metrics.totalTasks} total
            task
          </p>
        </div>

        {/* Mini Progress Bar */}
        <div className="mt-4 pt-3 border-t">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(metrics.completionRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card 2: Active Tasks */}
      <div className="group relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md hover:border-primary/40">
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Task In Progress</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {metrics.inProgressTasks}
            </span>
            <span className="text-xs text-muted-foreground">task aktif</span>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Sedang dikerjakan oleh {metrics.teamMembersCount} anggota tim
          </p>
        </div>

        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
          {urgentAndHighCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400 border border-rose-500/30">
              <Flame className="h-3 w-3" />
              <span>{urgentAndHighCount} Prioritas Tinggi</span>
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Beban prioritas stabil
            </span>
          )}

          <Link
            href={ROUTES.tasks}
            className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
          >
            <span>Detail</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Card 3: Active Projects & Milestones */}
      <div className="group relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md hover:border-primary/40">
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Project Berjalan</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {metrics.activeProjects}
            </span>
            <span className="text-xs text-muted-foreground">
              / {metrics.totalProjects} total
            </span>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Terhubung ke {metrics.totalMilestones} target milestone aktif
          </p>
        </div>

        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
          <span className="text-[11px] text-muted-foreground">
            {metrics.totalMilestones} Target Milestone
          </span>

          <Link
            href={ROUTES.projects()}
            className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
          >
            <span>Lihat Project</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Card 4: Team Capacity & Overload */}
      <div
        className={`group relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md ${
          hasOverload
            ? 'border-rose-500/40 bg-rose-500/[0.02] ring-1 ring-rose-500/20'
            : 'hover:border-primary/40'
        }`}
      >
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Beban Kerja Tim</span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                hasOverload
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              {hasOverload ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                hasOverload
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-foreground'
              }`}
            >
              {metrics.teamCapacityPercentage}%
            </span>
            <span className="text-xs text-muted-foreground">
              kapasitas rata-rata
            </span>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Ambang batas optimal beban kerja (&le; 80%)
          </p>
        </div>

        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
          {hasOverload ? (
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-400 animate-pulse border border-rose-500/30">
              <AlertTriangle className="h-3 w-3" />
              <span>{metrics.overloadedMembersCount} Overload</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3" />
              <span>Semua Optimal</span>
            </span>
          )}

          <Link
            href={ROUTES.workload}
            className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
          >
            <span>Buka Workload</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
