'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  ListTodo,
  FolderKanban,
  Target,
  Calendar,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { MyTask } from '../types/task.types';

interface MyTasksListProps {
  tasks: MyTask[];
}

type StatusTab = 'all' | 'todo' | 'in_progress' | 'review' | 'done';
type PriorityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

function normalizeStatus(
  name?: string
): 'todo' | 'in_progress' | 'review' | 'done' | 'other' {
  if (!name) return 'other';
  const lower = name.toLowerCase();
  if (
    lower.includes('todo') ||
    lower.includes('to do') ||
    lower.includes('backlog')
  )
    return 'todo';
  if (
    lower.includes('progress') ||
    lower.includes('doing') ||
    lower.includes('in work')
  )
    return 'in_progress';
  if (
    lower.includes('review') ||
    lower.includes('qa') ||
    lower.includes('testing')
  )
    return 'review';
  if (
    lower.includes('done') ||
    lower.includes('complete') ||
    lower.includes('selesai')
  )
    return 'done';
  return 'other';
}

function getColumnStatusDot(name?: string): string {
  const status = normalizeStatus(name);
  switch (status) {
    case 'todo':
      return 'bg-slate-400 dark:bg-slate-500';
    case 'in_progress':
      return 'bg-blue-500';
    case 'review':
      return 'bg-amber-500';
    case 'done':
      return 'bg-emerald-500';
    default:
      return 'bg-primary';
  }
}

function getPriorityBadgeClass(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'critical':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    case 'high':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    case 'medium':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'low':
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function MyTasksList({ tasks }: MyTasksListProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusTab, setStatusTab] = React.useState<StatusTab>('all');
  const [priorityFilter, setPriorityFilter] =
    React.useState<PriorityFilter>('all');

  const counts = React.useMemo(() => {
    return {
      all: tasks.length,
      in_progress: tasks.filter(
        (t) => normalizeStatus(t.column?.name) === 'in_progress'
      ).length,
      todo: tasks.filter((t) => normalizeStatus(t.column?.name) === 'todo')
        .length,
      review: tasks.filter((t) => normalizeStatus(t.column?.name) === 'review')
        .length,
      done: tasks.filter((t) => normalizeStatus(t.column?.name) === 'done')
        .length,
    };
  }, [tasks]);

  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        task.title.toLowerCase().includes(q) ||
        (task.description && task.description.toLowerCase().includes(q)) ||
        (task.project?.name && task.project.name.toLowerCase().includes(q)) ||
        (task.project?.milestone?.title &&
          task.project.milestone.title.toLowerCase().includes(q));

      const taskStatus = normalizeStatus(task.column?.name);
      const matchesStatus =
        statusTab === 'all' ? true : taskStatus === statusTab;

      const matchesPriority =
        priorityFilter === 'all'
          ? true
          : task.priority.toLowerCase() === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, statusTab, priorityFilter]);

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/40 p-12 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Belum Ada Tugas yang Ditugaskan
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Hebat! Semua tugas Anda telah selesai atau belum ada tugas baru yang
          ditugaskan kepada Anda. Silakan jelajahi project untuk melihat papan
          Kanban tim.
        </p>
        <div className="mt-5 flex justify-center">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <FolderKanban className="h-4 w-4" />
            <span>Jelajahi Project</span>
          </Link>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-5">
      {/* Status Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
        <button
          type="button"
          onClick={() => setStatusTab('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            statusTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Semua ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('in_progress')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            statusTab === 'in_progress'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          In Progress ({counts.in_progress})
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('todo')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            statusTab === 'todo'
              ? 'bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900 shadow-xs'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          To Do ({counts.todo})
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('review')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            statusTab === 'review'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Review ({counts.review})
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('done')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            statusTab === 'done'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Done ({counts.done})
        </button>
      </div>

      {/* Search & Priority Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari tugas, project, atau milestone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Prioritas:
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorityFilter(p)}
                  className={`rounded-md px-2 py-1 text-xs capitalize transition-colors ${
                    priorityFilter === p
                      ? 'bg-foreground text-background font-semibold'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {p === 'all' ? 'Semua' : p}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Task Cards Grid */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/40 p-8 text-center">
          <ListTodo className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium text-foreground">
            Tidak ada tugas yang sesuai
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Coba sesuaikan kata kunci pencarian atau filter status dan
            prioritas.
          </p>
          {(searchQuery || statusTab !== 'all' || priorityFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusTab('all');
                setPriorityFilter('all');
              }}
              className="mt-3 text-xs font-medium text-primary hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredTasks.map((task) => {
            const isDone = normalizeStatus(task.column?.name) === 'done';
            const isOverdue =
              task.due_date && task.due_date < todayStr && !isDone;

            return (
              <div
                key={task.id}
                className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="space-y-3">
                  {/* Top Badges (Status & Priority) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-0.5 text-xs font-medium text-foreground">
                        <span
                          className={`h-2 w-2 rounded-full ${getColumnStatusDot(task.column?.name)}`}
                        />
                        <span className="truncate">
                          {task.column?.name || 'Unassigned'}
                        </span>
                      </span>

                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${getPriorityBadgeClass(task.priority)}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                        <AlertCircle className="h-3 w-3" />
                        <span>Terlewat</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-card-foreground">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Project & Milestone context tags */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                    {task.project && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 font-medium text-foreground">
                        <FolderKanban className="h-3 w-3 text-primary" />
                        <span className="truncate max-w-[180px]">
                          {task.project.name}
                        </span>
                      </span>
                    )}

                    {task.project?.milestone && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-[11px]">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[180px]">
                          {task.project.milestone.title}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer: Due date & Kanban Shortcut */}
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {task.due_date ? (
                      <span
                        className={
                          isOverdue
                            ? 'font-semibold text-rose-600 dark:text-rose-400'
                            : ''
                        }
                      >
                        Tenggat:{' '}
                        {new Date(task.due_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/70">
                        Tanpa tenggat
                      </span>
                    )}
                  </div>

                  {task.project_id ? (
                    <Link
                      href={`/projects/${task.project_id}`}
                      className="inline-flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1 text-xs font-semibold text-primary hover:bg-muted transition-colors shadow-xs"
                    >
                      <span>Buka di Kanban</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60 italic">
                      Project tidak tersedia
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
