'use client';

import * as React from 'react';
import { Users, BarChart3 } from 'lucide-react';
import type { DashboardPerformanceData } from '../types/dashboard.types';
import { DashboardHeader } from './dashboard-header';
import { MetricCardsGrid } from './metric-cards-grid';
import { TaskCompletionChart } from './task-completion-chart';
import { PriorityDistributionCard } from './priority-distribution-card';
import { RecentTasksCard } from './recent-tasks-card';
import { TeamCapacityWidget } from './team-capacity-widget';

interface DashboardViewProps {
  initialData: DashboardPerformanceData | null;
}

export function DashboardView({ initialData }: DashboardViewProps) {
  // Empty state if user has no team
  if (!initialData || !initialData.teamId) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Dashboard Performa
            </h1>
            <p className="text-xs text-muted-foreground">
              Pemantauan performa kuartalan dan kapasitas tim
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-10 text-center shadow-xs">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-base font-semibold text-foreground">
            Belum Tergabung ke Tim
          </h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Kamu belum tergabung ke tim manapun sehingga metriks performa
            kuartalan belum dapat dikalkulasikan. Hubungi Team Leader untuk
            mendapatkan undangan bergabung ke tim.
          </p>
        </div>
      </div>
    );
  }

  const {
    teamName,
    userRole,
    currentQuarter,
    metrics,
    priorityDistribution,
    recentTasks,
    memberCapacities,
  } = initialData;

  const urgentAndHighCount =
    priorityDistribution.urgent + priorityDistribution.high;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Title, Quarter & Quick Nav */}
      <DashboardHeader
        teamName={teamName}
        quarterLabel={currentQuarter.label}
        currentQuarter={currentQuarter.quarter}
        currentYear={currentQuarter.year}
        userRole={userRole}
        overloadedMembersCount={metrics.overloadedMembersCount}
      />

      {/* 2. Top Metric Cards Grid (4 columns on desktop, 2 on tablet, 1 on mobile) */}
      <section aria-label="Metrik Utama Performa">
        <MetricCardsGrid
          metrics={metrics}
          urgentAndHighCount={urgentAndHighCount}
        />
      </section>

      {/* 3. Middle Section: Chart Placeholder & Priority Breakdown */}
      <section
        aria-label="Tren Kuartalan dan Distribusi Prioritas"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left: Interactive Task Completion Chart (col-span-2 on desktop) */}
        <div className="lg:col-span-2">
          <TaskCompletionChart
            trendData={initialData.trendData}
            quarterLabel={currentQuarter.label}
          />
        </div>

        {/* Right: Priority Breakdown Card (col-span-1 on desktop) */}
        <div className="lg:col-span-1">
          <PriorityDistributionCard distribution={priorityDistribution} />
        </div>
      </section>

      {/* 4. Bottom Section: Recent Tasks & Team Capacity Overview */}
      <section
        aria-label="Tugas Aktif dan Kapasitas Anggota"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left: Recent In-Progress Tasks (col-span-2 on desktop) */}
        <div className="lg:col-span-2">
          <RecentTasksCard tasks={recentTasks} />
        </div>

        {/* Right: Team Capacity Quick View (col-span-1 on desktop) */}
        <div className="lg:col-span-1">
          <TeamCapacityWidget members={memberCapacities} teamName={teamName} />
        </div>
      </section>
    </div>
  );
}
