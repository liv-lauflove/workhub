'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Tag,
  FolderKanban,
  Target,
  Calendar,
  AlertCircle,
  GitBranch,
  Flame,
  ArrowUpRight,
  Clock,
  Check,
  XCircle,
} from 'lucide-react';
import { TaskStatusSelector } from './task-status-selector';
import {
  TaskAssigneeSelector,
  type TeamMemberOption,
} from './task-assignee-selector';
import { TaskRoleAssigneeSelector } from './task-role-assignee-selector';
import { TaskDevTestControls } from './task-dev-test-controls';
import type { TaskDetail } from '../types/task.types';

interface TaskDetailSidebarProps {
  task: TaskDetail;
  availableColumns: { id: string; name: string; position: number }[];
  teamMembers?: TeamMemberOption[];
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
  teamMembers = [],
}: TaskDetailSidebarProps) {
  const isCsComplaint = task.origin === 'cs_complaint';
  const todayStr = React.useMemo(
    () => new Date().toISOString().split('T')[0],
    []
  );

  const isDoneColumn =
    task.column?.name?.toLowerCase().includes('done') ||
    task.column?.name?.toLowerCase().includes('selesai') ||
    task.column?.name?.toLowerCase().includes('complete');

  const isMerged = task.test_status === 'passed' || isDoneColumn;
  const isChangesRequested = task.test_status === 'failed';
  const isOpenPR =
    !isMerged && !isChangesRequested && task.dev_status === 'dev_done';

  const isOverdue = task.due_date && task.due_date < todayStr && !isDoneColumn;

  return (
    <aside className="space-y-6 rounded-xl border bg-card p-5 shadow-xs">
      {/* 1. Assignee / Developer (PIC Pengerjaan) */}
      <div className="border-b pb-4">
        <TaskAssigneeSelector
          taskId={task.id}
          projectId={task.project_id}
          currentAssignee={task.assignee}
          teamMembers={teamMembers}
          variant="sidebar"
        />
      </div>

      {/* 2. Tester / QA (Reviewer Resmi) */}
      <div className="border-b pb-4 space-y-1.5">
        <TaskRoleAssigneeSelector
          taskId={task.id}
          projectId={task.project_id}
          role="tester"
          currentUser={task.tester}
          teamMembers={teamMembers}
        />

        {task.tester && (
          <div className="flex items-center gap-1.5 px-1.5 pt-0.5 text-xs">
            {isMerged ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                <span>Approved (Lolos QA)</span>
              </span>
            ) : isChangesRequested ? (
              <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                <XCircle className="h-3.5 w-3.5" />
                <span>Changes requested</span>
              </span>
            ) : isOpenPR ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5 animate-pulse" />
                <span>Review requested</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
                <Clock className="h-3 w-3 opacity-60" />
                <span>Pending development</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Dev & Testing Status Controls */}
      <div className="border-b pb-4">
        <TaskDevTestControls
          taskId={task.id}
          projectId={task.project_id}
          purpose={task.purpose}
          initialDevStatus={task.dev_status}
          initialTestStatus={task.test_status}
          initialTestNotes={task.test_notes}
        />
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
