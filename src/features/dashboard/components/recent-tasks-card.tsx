'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Layers,
  ArrowUpRight,
  Flame,
  Calendar,
  FolderKanban,
  User as UserIcon,
} from 'lucide-react';
import type { DashboardRecentTask } from '../types/dashboard.types';
import { ROUTES } from '@/config/routes';

interface RecentTasksCardProps {
  tasks: DashboardRecentTask[];
}

function getPriorityBadge(priority?: string) {
  const norm = (priority || 'medium').toLowerCase();
  if (norm === 'urgent' || norm === 'critical') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400 border border-rose-500/30">
        <Flame className="h-2.5 w-2.5" />
        <span>Urgent</span>
      </span>
    );
  }
  if (norm === 'high') {
    return (
      <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-400 border border-orange-500/30">
        High
      </span>
    );
  }
  if (norm === 'medium') {
    return (
      <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400 border border-sky-500/30">
        Medium
      </span>
    );
  }
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground border">
      Low
    </span>
  );
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

export function RecentTasksCard({ tasks }: RecentTasksCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Tugas Berjalan Terkini
              </h3>
              <p className="text-xs text-muted-foreground">
                Daftar task yang sedang aktif dikerjakan oleh tim
              </p>
            </div>
          </div>

          <Link
            href={ROUTES.tasks}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>Semua Task</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* List of Tasks */}
        <div className="mt-3 divide-y divide-border/60">
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Tidak ada task yang sedang berjalan saat ini.
            </div>
          ) : (
            tasks.map((task) => {
              const formattedDue = formatDate(task.dueDate);
              return (
                <Link
                  key={task.id}
                  href={ROUTES.task(task.id)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3 hover:bg-muted/40 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {task.title}
                      </span>
                      {getPriorityBadge(task.priority)}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {task.projectName && (
                        <span className="inline-flex items-center gap-1">
                          <FolderKanban className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[140px]">
                            {task.projectName}
                          </span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded bg-muted/70 px-1.5 py-0.2">
                        {task.columnName}
                      </span>
                      {formattedDue && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formattedDue}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assignee Avatar */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {task.assignee ? (
                      <div
                        className="flex items-center gap-1.5"
                        title={task.assignee.fullName}
                      >
                        {task.assignee.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={task.assignee.avatarUrl}
                            alt={task.assignee.fullName}
                            className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
                          />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                            {getInitials(task.assignee.fullName)}
                          </div>
                        )}
                        <span className="text-xs font-medium text-foreground truncate max-w-[100px] hidden md:inline">
                          {task.assignee.fullName}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70 italic">
                        <UserIcon className="h-3.5 w-3.5" />
                        <span>Unassigned</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t text-right">
        <Link
          href={ROUTES.tasks}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Lihat selengkapnya di Task List &rarr;
        </Link>
      </div>
    </div>
  );
}
