'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Users,
  Briefcase,
  Layers,
  Search,
  CheckCircle2,
} from 'lucide-react';
import type { TeamWorkloadSummary } from '../types/workload.types';
import { MemberWorkloadCard } from './member-workload-card';
import { CapacityMeter } from './capacity-meter';

interface TeamWorkloadListProps {
  workload: TeamWorkloadSummary;
}

type FilterStatus = 'all' | 'overloaded' | 'optimal';

export function TeamWorkloadList({ workload }: TeamWorkloadListProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>('all');

  // Filter members based on search and status tabs
  const filteredMembers = React.useMemo(() => {
    return workload.members.filter((member) => {
      // 1. Search query match
      const matchesSearch = member.fullName
        .toLowerCase()
        .includes(searchQuery.toLowerCase().trim());

      // 2. Status tab match
      let matchesStatus = true;
      if (statusFilter === 'overloaded') {
        matchesStatus = member.isOverloaded;
      } else if (statusFilter === 'optimal') {
        matchesStatus = !member.isOverloaded;
      }

      return matchesSearch && matchesStatus;
    });
  }, [workload.members, searchQuery, statusFilter]);

  const overloadedCount = workload.overloadedMembersCount;
  const optimalCount = workload.members.length - overloadedCount;

  return (
    <div className="space-y-6">
      {/* 1. Overload Warning Alert Banner */}
      {overloadedCount > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-800 dark:text-rose-300 shadow-xs"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold">
              Peringatan Kapasitas Tim ({overloadedCount} Anggota Overload)
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-rose-700/90 dark:text-rose-300/90">
              Terdapat {overloadedCount} anggota tim dengan beban kerja melebihi
              ambang batas optimal (&gt;80% baseline). Disarankan untuk
              menyesuaikan pembagian tugas atau mendelegasikan task prioritas
              tinggi ke anggota yang masih memiliki kapasitas.
            </p>
          </div>
        </div>
      )}

      {/* 2. Team Overview Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Members */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Anggota Tim
            </span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {workload.members.length}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tim {workload.teamName}
          </p>
        </div>

        {/* Stat 2: Active Tasks */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Task Aktif
            </span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {workload.totalActiveTasks}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Task In Progress / Open
          </p>
        </div>

        {/* Stat 3: Total Weight */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Bobot Kerja
            </span>
            <Briefcase className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {workload.totalTeamWeight}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              pts
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Baseline: {workload.baselinePoints} pts / anggota
          </p>
        </div>

        {/* Stat 4: Average Team Capacity */}
        <div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Kapasitas Rata-rata
            </span>
            {overloadedCount > 0 ? (
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
          </div>
          <div className="mt-2">
            <CapacityMeter
              percentage={workload.teamCapacityPercentage}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 3. Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Status Filter Tabs */}
        <div className="flex items-center rounded-lg bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-md px-3 py-1.5 font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Semua ({workload.members.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('overloaded')}
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 font-medium transition-all ${
              statusFilter === 'overloaded'
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Overload ({overloadedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('optimal')}
            className={`rounded-md px-3 py-1.5 font-medium transition-all ${
              statusFilter === 'optimal'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Optimal ({optimalCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari anggota tim..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* 4. Members Grid */}
      {filteredMembers.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center bg-card/40">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <h4 className="mt-2 text-sm font-semibold text-foreground">
            Tidak Ada Anggota yang Cocok
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {searchQuery
              ? `Tidak ditemukan anggota dengan nama "${searchQuery}".`
              : 'Tidak ada anggota dengan filter status ini.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <MemberWorkloadCard key={member.userId} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
