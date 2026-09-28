'use client';

import * as React from 'react';
import { Calendar, AlertCircle, GitBranch, Flame } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  TaskAssigneeSelector,
  type TeamMemberOption,
} from '@/features/tasks/components/task-assignee-selector';
import type { TaskWithAssignee } from '../types/kanban.types';

interface KanbanCardProps {
  task: TaskWithAssignee;
  teamMembers?: TeamMemberOption[];
  isColumnDone?: boolean;
  onClick?: (task: TaskWithAssignee) => void;
  className?: string;
  isOverlay?: boolean;
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
  teamMembers = [],
  isColumnDone = false,
  onClick,
  className = '',
  isOverlay = false,
}: KanbanCardProps) {
  const isCsComplaint = task.origin === 'cs_complaint';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
    disabled: isOverlay,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

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
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="article"
      tabIndex={0}
      aria-label={`Tugas: ${task.title}. Prioritas: ${task.priority || 'tidak diset'}.${isOverdue ? ' Batas waktu telah terlewat.' : ''}`}
      onClick={() => onClick?.(task)}
      onKeyDown={handleKeyDown}
      className={`group relative flex flex-col gap-2.5 rounded-xl border bg-card p-3.5 shadow-xs transition-all select-none hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-30 border-dashed border-primary/40 ring-2 ring-primary/20'
          : ''
      } ${
        isOverlay
          ? 'cursor-grabbing shadow-xl scale-[1.02] rotate-1 border-primary z-50 ring-2 ring-primary/30'
          : ''
      } ${
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

        {/* Assignee Selector / Avatar */}
        <TaskAssigneeSelector
          taskId={task.id}
          projectId={task.project_id}
          currentAssignee={task.assignee}
          teamMembers={teamMembers}
          variant="card"
        />
      </div>
    </div>
  );
}
