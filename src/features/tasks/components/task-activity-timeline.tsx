'use client';

import * as React from 'react';
import {
  ArrowRightLeft,
  Calendar,
  CircleDot,
  FileText,
  Flag,
  GitBranch,
  History,
  MoveRight,
  Pencil,
  UserCheck,
  UserMinus,
  Sparkles,
} from 'lucide-react';
import type { TaskActivityLog, TaskDetail } from '../types/task.types';

interface TaskActivityTimelineProps {
  activities: TaskActivityLog[];
  task: TaskDetail;
  availableColumns?: { id: string; name: string }[];
  teamMembers?: { id: string; full_name: string; avatar_url?: string | null }[];
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDetailDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatTimeOnly(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace(':', '.');
  } catch {
    return '';
  }
}

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'baru saja';
    if (diffMinutes < 60) return `${diffMinutes} mnt yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays === 1) return 'kemarin';
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    return formatShortDate(dateStr);
  } catch {
    return '';
  }
}

export function TaskActivityTimeline({
  activities = [],
  task,
  availableColumns = [],
  teamMembers = [],
}: TaskActivityTimelineProps) {
  const creatorName = task.creator?.full_name || 'Anggota Tim';

  // Build lookup maps
  const columnMap = React.useMemo(() => {
    const map = new Map<string, string>();
    availableColumns.forEach((c) => map.set(c.id, c.name));
    if (task.column) {
      map.set(task.column.id, task.column.name);
    }
    return map;
  }, [availableColumns, task.column]);

  const memberMap = React.useMemo(() => {
    const map = new Map<string, string>();
    teamMembers.forEach((m) => map.set(m.id, m.full_name));
    if (task.assignee) {
      map.set(task.assignee.id, task.assignee.full_name);
    }
    if (task.creator) {
      map.set(task.creator.id, task.creator.full_name);
    }
    return map;
  }, [teamMembers, task.assignee, task.creator]);

  // Helper to build lexical text, diff badge, and icons
  const parseActivity = React.useCallback(
    (item: TaskActivityLog) => {
      const actorName = item.actor?.full_name || 'Pengguna';
      const timeStr = formatTimeOnly(item.created_at);
      const timeSuffix = timeStr ? ` pada jam ${timeStr}` : '';

      switch (item.field_name) {
        case 'column_id': {
          const oldName = item.old_value
            ? columnMap.get(item.old_value) || 'Kolom Sebelumnya'
            : null;
          const newName = item.new_value
            ? columnMap.get(item.new_value) || 'Kolom Baru'
            : 'Tanpa Kolom';

          return {
            icon: ArrowRightLeft,
            iconClass:
              'bg-sky-500/10 text-sky-600 border-sky-500/30 dark:text-sky-400',
            badgeClass:
              'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
            actorName,
            lexicalAction: oldName
              ? `memindahkan task dari "${oldName}" ke "${newName}"${timeSuffix}`
              : `memindahkan task ke kolom "${newName}"${timeSuffix}`,
            diff: oldName ? { old: oldName, new: newName } : null,
          };
        }

        case 'priority': {
          const formatPriority = (val?: string | null) => {
            if (!val) return 'Medium';
            return val.charAt(0).toUpperCase() + val.slice(1);
          };
          const oldP = formatPriority(item.old_value);
          const newP = formatPriority(item.new_value);

          return {
            icon: Flag,
            iconClass:
              'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
            badgeClass:
              'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
            actorName,
            lexicalAction: `mengubah prioritas task dari "${oldP}" menjadi "${newP}"${timeSuffix}`,
            diff: { old: oldP, new: newP },
          };
        }

        case 'assignee_id': {
          const oldAssignee = item.old_value
            ? memberMap.get(item.old_value) || 'Anggota sebelumnya'
            : null;
          const newAssignee = item.new_value
            ? memberMap.get(item.new_value) || 'Anggota tim'
            : null;

          if (newAssignee && oldAssignee) {
            return {
              icon: UserCheck,
              iconClass:
                'bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400',
              badgeClass:
                'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
              actorName,
              lexicalAction: `mengalihkan penugasan task dari ${oldAssignee} ke ${newAssignee}${timeSuffix}`,
              diff: { old: oldAssignee, new: newAssignee },
            };
          }

          if (newAssignee) {
            return {
              icon: UserCheck,
              iconClass:
                'bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400',
              badgeClass:
                'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
              actorName,
              lexicalAction: `menugaskan task ini kepada ${newAssignee}${timeSuffix}`,
              diff: null,
            };
          }

          return {
            icon: UserMinus,
            iconClass:
              'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400',
            badgeClass:
              'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
            actorName,
            lexicalAction: oldAssignee
              ? `melepas penugasan task dari ${oldAssignee}${timeSuffix}`
              : `melepas penugasan task (unassigned)${timeSuffix}`,
            diff: null,
          };
        }

        case 'due_date': {
          const oldDate = item.old_value
            ? formatShortDate(item.old_value)
            : null;
          const newDate = item.new_value
            ? formatShortDate(item.new_value)
            : null;

          return {
            icon: Calendar,
            iconClass:
              'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
            badgeClass:
              'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
            actorName,
            lexicalAction: newDate
              ? oldDate
                ? `mengubah tenggat waktu task dari ${oldDate} ke ${newDate}${timeSuffix}`
                : `menentukan tenggat waktu task pada ${newDate}${timeSuffix}`
              : `menghapus tenggat waktu task${timeSuffix}`,
            diff: oldDate && newDate ? { old: oldDate, new: newDate } : null,
          };
        }

        case 'title': {
          return {
            icon: Pencil,
            iconClass:
              'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400',
            badgeClass:
              'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
            actorName,
            lexicalAction: `mengubah judul task menjadi "${item.new_value}"${timeSuffix}`,
            diff: null,
          };
        }

        case 'description': {
          return {
            icon: FileText,
            iconClass:
              'bg-zinc-500/10 text-zinc-600 border-zinc-500/30 dark:text-zinc-400',
            badgeClass:
              'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
            actorName,
            lexicalAction: `memperbarui deskripsi task${timeSuffix}`,
            diff: null,
          };
        }

        case 'github_branch': {
          return {
            icon: GitBranch,
            iconClass:
              'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400',
            badgeClass:
              'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
            actorName,
            lexicalAction: item.new_value
              ? `menautkan branch GitHub "${item.new_value}"${timeSuffix}`
              : `menghapus tautan branch GitHub${timeSuffix}`,
            diff: null,
          };
        }

        default: {
          return {
            icon: History,
            iconClass: 'bg-muted text-muted-foreground border-border',
            badgeClass: 'bg-muted text-muted-foreground border-border',
            actorName,
            lexicalAction: `memperbarui data task (${item.field_name})${timeSuffix}`,
            diff: null,
          };
        }
      }
    },
    [columnMap, memberMap]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
          <History className="h-4 w-4 text-primary" />
          <span>Timeline Aktivitas</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {activities.length}
          </span>
        </div>

        <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
          Diurutkan otomatis dari yang terbaru
        </span>
      </div>

      {/* Vertical Timeline Track */}
      <div className="relative pl-10 space-y-6 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/80">
        {/* Dynamic Activity Log Events */}
        {activities.map((item) => {
          const parsed = parseActivity(item);
          const Icon = parsed.icon;
          const actorAvatar = item.actor?.avatar_url;

          return (
            <div
              key={item.id}
              className="relative flex flex-col gap-1.5 transition-all group"
            >
              {/* Timeline Icon Node */}
              <div
                className={`absolute -left-10 flex h-7 w-7 items-center justify-center rounded-full border shadow-2xs ring-4 ring-background transition-transform group-hover:scale-110 ${parsed.iconClass}`}
                title={item.field_name}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>

              {/* Event Content Header */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-center gap-1.5 shrink-0">
                  {actorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={actorAvatar}
                      alt={parsed.actorName}
                      className="h-4 w-4 rounded-full object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-bold">
                      {getInitials(parsed.actorName)}
                    </div>
                  )}
                  <span className="font-semibold text-foreground">
                    {parsed.actorName}
                  </span>
                </div>

                <span className="text-foreground/90">
                  {parsed.lexicalAction}
                </span>

                <span
                  className="ml-auto text-[11px] text-muted-foreground/75 font-normal shrink-0"
                  title={formatDetailDate(item.created_at)}
                >
                  {getRelativeTime(item.created_at)}
                </span>
              </div>

              {/* Diff Preview Pill if available */}
              {parsed.diff && (
                <div className="flex items-center gap-2 pt-0.5">
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium shadow-2xs ${parsed.badgeClass}`}
                  >
                    <span className="line-through opacity-75">
                      {parsed.diff.old}
                    </span>
                    <MoveRight className="h-3 w-3 shrink-0 opacity-60" />
                    <span className="font-semibold">{parsed.diff.new}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Initial Event: Task Created */}
        <div className="relative flex items-center gap-3">
          <div className="absolute -left-10 flex h-7 w-7 items-center justify-center rounded-full bg-background border shadow-2xs text-emerald-600 dark:text-emerald-400 ring-4 ring-background">
            <CircleDot className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 w-full text-xs text-muted-foreground leading-relaxed">
            <div>
              <span className="font-semibold text-foreground">
                {creatorName}
              </span>{' '}
              membuat task ini pada {formatDetailDate(task.created_at)}
            </div>
            <span className="text-[11px] text-muted-foreground/75">
              {getRelativeTime(task.created_at)}
            </span>
          </div>
        </div>

        {/* Milestone info if assigned */}
        {task.project?.milestone && (
          <div className="relative flex items-center gap-3">
            <div className="absolute -left-10 flex h-7 w-7 items-center justify-center rounded-full bg-background border shadow-2xs text-muted-foreground ring-4 ring-background">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              Berkontribusi ke milestone{' '}
              <span className="font-semibold text-foreground">
                {task.project.milestone.title}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
