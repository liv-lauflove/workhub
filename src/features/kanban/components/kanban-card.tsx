'use client';

import * as React from 'react';
import {
  Calendar,
  AlertCircle,
  GitBranch,
  Flame,
  User as UserIcon,
} from 'lucide-react';
import type { TaskWithAssignee } from '../types/kanban.types';

interface KanbanCardProps {
  task: TaskWithAssignee;
  isColumnDone?: boolean;
  onClick?: (task: TaskWithAssignee) => void;
  className?: string;
}

/**
 * Returns Tailwind classes for priority badges with high visual contrast.
 */
function getPriorityBadgeClass(priority?: string): string {
  switch (priority?.toLowerCase()) {
    case 'critical':
    case 'urgent':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
    case 'high':
      return 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30';
    case 'medium':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30';
    case 'low':
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
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

/**
 * Format date string into Indonesian locale shorthand (e.g. "24 Sep").
 */
function formatDueDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

export function KanbanCard({
  task,
  isColumnDone = false,
  onClick,
  className = '',
}: KanbanCardProps) {
  const isCsComplaint = task.origin === 'cs_complaint';

  const todayStr = React.useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const isOverdue = React.useMemo(() => {
    if (!task.due_date || isColumnDone) return false;
    return task.due_date < todayStr;
  }, [task.due_date, isColumnDone, todayStr]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(task);
    }
  };

  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`Tugas: ${task.title}. Prioritas: ${task.priority || 'tidak diset'}.${isOverdue ? ' Batas waktu telah terlewat.' : ''}`}
      onClick={() => onClick?.(task)}
      onKeyDown={handleKeyDown}
      className={`group relative flex flex-col gap-2.5 rounded-xl border bg-card p-3.5 shadow-xs transition-all select-none hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
        isCsComplaint
          ? 'border-l-4 border-l-rose-500 dark:border-l-rose-500'
          : ''
      } ${className}`}
    >
      {/* 1. Header Badges: Priority, Origin, and Overdue */}
      <div className="flex flex-wrap items-center gap-1.5">
        {task.priority && (
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize tracking-tight ${getPriorityBadgeClass(
              task.priority
            )}`}
          >
            {task.priority}
          </span>
        )}

        {isCsComplaint && (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400"
            title={task.origin_note || 'Berasal dari keluhan CS'}
          >
            <Flame className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400 animate-pulse" />
            <span>CS Complaint</span>
          </span>
        )}

        {isOverdue && (
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>Terlewat</span>
          </span>
        )}
      </div>

      {/* 2. Task Title */}
      <h4 className="text-sm font-semibold text-card-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
        {task.title}
      </h4>

      {/* 3. Task Description (optional) */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* 4. GitHub Branch Tag (optional) */}
      {task.github_branch && (
        <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted/50 rounded px-2 py-0.5 max-w-full">
          <GitBranch className="h-3 w-3 shrink-0 text-primary" />
          <span className="truncate">{task.github_branch}</span>
        </div>
      )}

      {/* 5. Footer: Due Date & Assignee */}
      <div className="flex items-center justify-between border-t border-border/60 pt-2.5 mt-0.5 text-xs">
        {/* Due Date Indicator */}
        <div
          className={`flex items-center gap-1.5 text-[11px] ${
            isOverdue
              ? 'font-semibold text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground'
          }`}
          title={
            task.due_date
              ? `Tenggat waktu: ${task.due_date}`
              : 'Tidak ada tenggat waktu'
          }
        >
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            {task.due_date ? formatDueDate(task.due_date) : 'Tanpa tenggat'}
          </span>
        </div>

        {/* Assignee Avatar & Name */}
        <div
          className="flex items-center gap-1.5 max-w-[150px] min-w-0"
          title={
            task.assignee?.full_name
              ? `Ditugaskan kepada: ${task.assignee.full_name}`
              : 'Belum ditugaskan'
          }
        >
          {task.assignee ? (
            <>
              {task.assignee.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={task.assignee.avatar_url}
                  alt={task.assignee.full_name}
                  className="h-5 w-5 rounded-full object-cover shrink-0 border ring-1 ring-background"
                />
              ) : (
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold shrink-0 ${getAvatarBgColor(
                    task.assignee.full_name
                  )}`}
                  aria-hidden="true"
                >
                  {getInitials(task.assignee.full_name)}
                </div>
              )}
              <span className="truncate text-[11px] font-medium text-foreground">
                {task.assignee.full_name}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
              <UserIcon className="h-3.5 w-3.5" />
              <span>Unassigned</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
