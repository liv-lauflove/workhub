'use client';

import * as React from 'react';
import {
  Flame,
  AlertTriangle,
  Briefcase,
  Layers,
  Crown,
  User,
} from 'lucide-react';
import type { MemberWorkload } from '../types/workload.types';
import { CapacityMeter } from './capacity-meter';

interface MemberWorkloadCardProps {
  member: MemberWorkload;
}

/**
 * Generate consistent 2-letter initials from a full name.
 */
function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Generates a deterministic subtle background color based on name for avatar initials.
 */
function getAvatarBgColor(name?: string): string {
  if (!name) return 'bg-muted text-muted-foreground';
  const colors = [
    'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
    'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    'bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30',
    'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
    'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
    'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function MemberWorkloadCard({ member }: MemberWorkloadCardProps) {
  const isLeader = member.role === 'leader';
  const { urgentCount, highCount, mediumCount, lowCount } = member.tasksSummary;

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition-all hover:shadow-md ${
        member.isOverloaded
          ? 'border-rose-500/40 bg-rose-500/[0.03] ring-1 ring-rose-500/20'
          : 'hover:border-primary/40'
      }`}
    >
      {/* 1. Header: Avatar, Name, Role, & Overload Callout */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatarUrl}
              alt={member.fullName}
              className="h-9 w-9 rounded-full object-cover shrink-0 border ring-1 ring-background"
            />
          ) : (
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold shrink-0 ${getAvatarBgColor(
                member.fullName
              )}`}
              aria-hidden="true"
            >
              {getInitials(member.fullName)}
            </div>
          )}

          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {member.fullName}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[10px] font-medium capitalize ${
                  isLeader
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {isLeader ? (
                  <Crown className="h-2.5 w-2.5" />
                ) : (
                  <User className="h-2.5 w-2.5" />
                )}
                <span>{member.role}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Visual Callout for Overload */}
        {member.isOverloaded && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400 animate-pulse shrink-0"
            title="Kapasitas kerja anggota ini melebihi 80% (> baseline points)"
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Overload</span>
          </span>
        )}
      </div>

      {/* 2. Capacity Progress Meter */}
      <div className="mt-4 pt-3 border-t border-border/60">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-medium flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            Beban Kerja
          </span>
        </div>
        <CapacityMeter
          percentage={member.capacityPercentage}
          totalWeight={member.totalWeight}
          baselinePoints={member.baselinePoints}
          size="md"
        />
      </div>

      {/* 3. Task Breakdown Footer */}
      <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Layers className="h-3 w-3" />
          <span>{member.activeTaskCount} task aktif</span>
        </div>

        {/* Priority breakdown badges */}
        <div className="flex items-center gap-1">
          {urgentCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 px-1.5 py-0.5 text-[10px] font-semibold border border-rose-500/30"
              title={`${urgentCount} task Urgent / Critical`}
            >
              <Flame className="h-2.5 w-2.5" />
              <span>{urgentCount}U</span>
            </span>
          )}
          {highCount > 0 && (
            <span
              className="rounded bg-orange-500/15 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 text-[10px] font-semibold border border-orange-500/30"
              title={`${highCount} task High Priority`}
            >
              {highCount}H
            </span>
          )}
          {mediumCount > 0 && (
            <span
              className="rounded bg-sky-500/15 text-sky-700 dark:text-sky-400 px-1.5 py-0.5 text-[10px] font-semibold border border-sky-500/30"
              title={`${mediumCount} task Medium Priority`}
            >
              {mediumCount}M
            </span>
          )}
          {lowCount > 0 && (
            <span
              className="rounded bg-slate-500/15 text-slate-700 dark:text-slate-400 px-1.5 py-0.5 text-[10px] font-semibold border border-slate-500/30"
              title={`${lowCount} task Low Priority`}
            >
              {lowCount}L
            </span>
          )}
          {member.activeTaskCount === 0 && (
            <span className="text-[11px] text-muted-foreground/70 italic">
              Tidak ada task
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
