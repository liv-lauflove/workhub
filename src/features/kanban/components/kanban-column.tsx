'use client';

import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { BoardColumnWithTasks } from '../types/kanban.types';

interface KanbanColumnProps {
  column: BoardColumnWithTasks;
}

function getColumnStatusDot(name: string): string {
  const lower = name.toLowerCase();
  if (
    lower.includes('todo') ||
    lower.includes('to do') ||
    lower.includes('backlog')
  ) {
    return 'bg-slate-400 dark:bg-slate-500';
  }
  if (
    lower.includes('progress') ||
    lower.includes('doing') ||
    lower.includes('in work')
  ) {
    return 'bg-blue-500';
  }
  if (
    lower.includes('review') ||
    lower.includes('qa') ||
    lower.includes('testing')
  ) {
    return 'bg-amber-500';
  }
  if (
    lower.includes('done') ||
    lower.includes('complete') ||
    lower.includes('selesai')
  ) {
    return 'bg-emerald-500';
  }
  return 'bg-primary';
}

function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
    case 'high':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20';
    case 'medium':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
    case 'low':
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
    default:
      return 'bg-muted text-muted-foreground border border-border';
  }
}

export function KanbanColumn({ column }: KanbanColumnProps) {
  const dotColorClass = getColumnStatusDot(column.name);

  return (
    <div className="flex w-[320px] min-w-[280px] max-w-[340px] shrink-0 flex-col rounded-xl border bg-muted/40 shadow-xs">
      {/* Column Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-card/60 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColorClass}`}
            aria-hidden="true"
          />
          <h3 className="truncate text-sm font-semibold text-foreground">
            {column.name}
          </h3>
          <span className="rounded-full bg-muted border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {column.taskCount}
          </span>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          <button
            type="button"
            className="rounded-md p-1 hover:bg-muted hover:text-foreground transition-colors"
            title="Opsi kolom"
            aria-label="Opsi kolom"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Column Body / Task List Container */}
      <div className="flex flex-1 flex-col gap-2.5 p-3 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[400px]">
        {column.tasks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-card/30 p-6 text-center min-h-[140px]">
            <p className="text-xs font-medium text-muted-foreground">
              Belum ada task
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Task yang ditambahkan akan tampil di sini
            </p>
          </div>
        ) : (
          column.tasks.map((task) => (
            <div
              key={task.id}
              className="group rounded-lg border bg-card p-3 shadow-xs space-y-2 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-semibold text-card-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                  {task.title}
                </h4>
                {task.priority && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${getPriorityBadgeClass(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                )}
              </div>

              {task.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                <span>
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'Tanpa tenggat'}
                </span>

                <div className="flex items-center gap-1.5">
                  {task.assignee?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={task.assignee.avatar_url}
                      alt={task.assignee.full_name}
                      className="h-4 w-4 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-medium text-foreground">
                      {task.assignee?.full_name || 'Unassigned'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
