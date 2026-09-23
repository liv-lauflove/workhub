'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  Tag,
  FolderKanban,
  Target,
  Calendar,
  AlertCircle,
  GitBranch,
  Flame,
  User as UserIcon,
  ArrowUpRight,
} from 'lucide-react';
import { TaskStatusSelector } from './task-status-selector';
import type { TaskDetail } from '../types/task.types';

interface TaskDetailSidebarProps {
  task: TaskDetail;
  availableColumns: { id: string; name: string; position: number }[];
}

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

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDueDate(dateStr: string): string {
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

export function TaskDetailSidebar({
  task,
  availableColumns,
}: TaskDetailSidebarProps) {
  const isCsComplaint = task.origin === 'cs_complaint';
  const todayStr = React.useMemo(
    () => new Date().toISOString().split('T')[0],
    []
  );

  const isDoneColumn =
    task.column?.name?.toLowerCase().includes('done') ||
    task.column?.name?.toLowerCase().includes('selesai');

  const isOverdue = task.due_date && task.due_date < todayStr && !isDoneColumn;

  return (
    <aside className="space-y-6 rounded-xl border bg-card p-5 shadow-xs">
      {/* 1. Assignees Section */}
      <div className="border-b pb-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>Assignees</span>
          </div>
        </div>

        {task.assignee ? (
          <div className="flex items-center gap-2.5 pt-1">
            {task.assignee.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={task.assignee.avatar_url}
                alt={task.assignee.full_name}
                className="h-7 w-7 rounded-full object-cover ring-1 ring-border shrink-0"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                {getInitials(task.assignee.full_name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {task.assignee.full_name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {task.assignee.email || 'Penanggung Jawab (PIC)'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground/80">
            <UserIcon className="h-4 w-4 text-muted-foreground/60" />
            <span className="italic">Belum ada anggota yang ditugaskan</span>
          </div>
        )}
      </div>

      {/* 2. Labels / Priority Section */}
      <div className="border-b pb-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            <span>Labels & Prioritas</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {task.priority && (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize tracking-tight ${getPriorityBadgeClass(
                task.priority
              )}`}
            >
              priority: {task.priority}
            </span>
          )}

          {isCsComplaint && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400"
              title={task.origin_note || 'Keluhan CS'}
            >
              <Flame className="h-3 w-3 shrink-0 animate-pulse text-rose-600 dark:text-rose-400" />
              <span>origin: cs-complaint</span>
            </span>
          )}
        </div>
      </div>

      {/* 3. Projects Section */}
      <div className="border-b pb-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" />
            <span>Projects</span>
          </div>
        </div>

        {task.project ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Link
                href={`/projects/${task.project.id}`}
                className="group flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors truncate"
              >
                <span className="truncate">{task.project.name}</span>
                <ArrowUpRight className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>

            {/* Quick Column Status Selector */}
            <div className="pt-1">
              <span className="text-[11px] text-muted-foreground block mb-1">
                Kolom Kanban Saat Ini:
              </span>
              <TaskStatusSelector
                taskId={task.id}
                currentColumnId={task.column_id}
                currentColumnName={task.column?.name}
                projectId={task.project_id}
                availableColumns={availableColumns}
              />
            </div>
          </div>
        ) : (
          <p className="pt-1 text-xs text-muted-foreground italic">
            Belum terhubung ke project spesifik
          </p>
        )}
      </div>

      {/* 4. Milestone Section */}
      <div className="border-b pb-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            <span>Milestone</span>
          </div>
        </div>

        {task.project?.milestone ? (
          <div className="space-y-1 pt-1">
            <p className="text-xs font-semibold text-foreground truncate">
              {task.project.milestone.title}
            </p>
            {task.project.milestone.target_date && (
              <p className="text-[11px] text-muted-foreground">
                Target: {formatDueDate(task.project.milestone.target_date)}
              </p>
            )}
          </div>
        ) : (
          <p className="pt-1 text-xs text-muted-foreground italic">
            Tanpa milestone
          </p>
        )}
      </div>

      {/* 5. Due Date Section */}
      <div className="border-b pb-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Due Date</span>
          </div>
          {isOverdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>Terlewat</span>
            </span>
          )}
        </div>

        <div className="pt-1 text-xs">
          {task.due_date ? (
            <span
              className={
                isOverdue
                  ? 'font-semibold text-rose-600 dark:text-rose-400'
                  : 'text-foreground'
              }
            >
              {formatDueDate(task.due_date)}
            </span>
          ) : (
            <span className="text-muted-foreground italic">
              Tidak ada tenggat waktu
            </span>
          )}
        </div>
      </div>

      {/* 6. Development Section (GitHub Issue Style) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            <span>Development</span>
          </div>
        </div>

        {task.github_branch ? (
          <div className="pt-1 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1 text-xs font-mono text-foreground max-w-full">
              <GitBranch className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{task.github_branch}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Branch aktif untuk pelacakan kode
            </p>
          </div>
        ) : (
          <div className="pt-1 space-y-1">
            <p className="text-xs text-muted-foreground italic">
              Belum ada branch GitHub yang ditautkan.
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              Integrasi sinkronisasi commit otomatis akan aktif di Fase 3.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
