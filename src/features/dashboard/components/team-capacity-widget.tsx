'use client';

import * as React from 'react';
import Link from 'next/link';
import { Users, AlertTriangle, ArrowUpRight, Crown, User } from 'lucide-react';
import type { DashboardMemberCapacity } from '../types/dashboard.types';
import { ROUTES } from '@/config/routes';
import { OVERLOAD_THRESHOLD } from '@/lib/constants';

interface TeamCapacityWidgetProps {
  members: DashboardMemberCapacity[];
  teamName: string;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function TeamCapacityWidget({
  members,
  teamName,
}: TeamCapacityWidgetProps) {
  const overloadedCount = members.filter((m) => m.isOverloaded).length;

  return (
    <div className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Kapasitas Tim {teamName}
              </h3>
              <p className="text-xs text-muted-foreground">
                Ringkasan beban kerja tiap anggota
              </p>
            </div>
          </div>

          <Link
            href={ROUTES.workload}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>Buka Workload</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Overload Alert Warning */}
        {overloadedCount > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>
              <strong>{overloadedCount} anggota</strong> melebihi ambang batas (
              {OVERLOAD_THRESHOLD}%).
            </span>
          </div>
        )}

        {/* Member Capacity List */}
        <div className="mt-3 space-y-3">
          {members.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Belum ada anggota di dalam tim ini.
            </div>
          ) : (
            members.slice(0, 5).map((member) => {
              const isLeader = member.role === 'leader';
              const isOver = member.isOverloaded;
              const barColor = isOver
                ? 'bg-rose-500'
                : member.capacityPercentage >= 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

              return (
                <div key={member.userId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {member.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.avatarUrl}
                          alt={member.fullName}
                          className="h-6 w-6 rounded-full object-cover ring-1 ring-border shrink-0"
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                          {getInitials(member.fullName)}
                        </div>
                      )}
                      <span className="font-medium text-foreground truncate">
                        {member.fullName}
                      </span>
                      {isLeader ? (
                        <span
                          title="Team Leader"
                          className="inline-flex items-center"
                        >
                          <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                        </span>
                      ) : (
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isOver && (
                        <span className="rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 text-[10px] font-bold px-1.5 py-0.2 border border-rose-500/30">
                          Overload
                        </span>
                      )}
                      <span
                        className={`font-bold text-xs ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}
                      >
                        {member.capacityPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{
                        width: `${Math.min(member.capacityPercentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t text-right">
        <Link
          href={ROUTES.workload}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Lihat analisis kapasitas lengkap &rarr;
        </Link>
      </div>
    </div>
  );
}
