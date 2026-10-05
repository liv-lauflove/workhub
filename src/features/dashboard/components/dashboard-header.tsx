'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Layers,
  Target,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { DashboardFilter } from './dashboard-filter';
import { DashboardExportButton } from './dashboard-export-button';

interface DashboardHeaderProps {
  teamName: string;
  quarterLabel: string;
  currentQuarter: number;
  currentYear: number;
  userRole: string;
  overloadedMembersCount: number;
}

export function DashboardHeader({
  teamName,
  quarterLabel,
  currentQuarter,
  currentYear,
  userRole,
  overloadedMembersCount,
}: DashboardHeaderProps) {
  const isLeader = userRole === 'leader';

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* 1. Title & Team Context */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 shadow-2xs">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Dashboard Performa
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Users className="h-3 w-3" />
                <span>Tim {teamName}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{quarterLabel}</span>
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Pemantauan performa kuartalan, progres tugas, dan kapasitas kerja
              tim.
            </p>
          </div>
        </div>

        {/* 2. Quick Actions & Overload Alert Pill */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isLeader && overloadedMembersCount > 0 && (
            <Link
              href={ROUTES.workload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
              title="Klik untuk membuka detail beban kerja tim"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>{overloadedMembersCount} Overload</span>
            </Link>
          )}

          <Link
            href={ROUTES.workload}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer"
          >
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            <span>Workload Tim</span>
          </Link>

          <Link
            href={ROUTES.milestones}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer"
          >
            <Target className="h-3.5 w-3.5 text-amber-500" />
            <span>Milestones</span>
          </Link>

          <Link
            href={ROUTES.tasks}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Daftar Task</span>
          </Link>
        </div>
      </div>

      {/* 3. Filter & Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-card/60 p-2.5 shadow-2xs">
        <React.Suspense
          fallback={
            <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/60" />
          }
        >
          <DashboardFilter
            currentQuarter={currentQuarter}
            currentYear={currentYear}
          />
        </React.Suspense>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <React.Suspense
            fallback={
              <div className="h-8 w-24 animate-pulse rounded-lg bg-muted/60" />
            }
          >
            <DashboardExportButton variant="toolbar" />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
}
