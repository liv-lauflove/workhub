'use client';

import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type {
  BoardColumnWithTasks,
  TaskWithAssignee,
} from '../types/kanban.types';
import { KanbanCard } from './kanban-card';

interface KanbanColumnProps {
  column: BoardColumnWithTasks;
  onCardClick?: (task: TaskWithAssignee) => void;
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

function checkIsDoneColumn(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('done') ||
    lower.includes('complete') ||
    lower.includes('selesai')
  );
}

export function KanbanColumn({ column, onCardClick }: KanbanColumnProps) {
  const dotColorClass = getColumnStatusDot(column.name);
  const isDoneColumn = checkIsDoneColumn(column.name);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  const taskIds = React.useMemo(() => {
    return column.tasks.map((task) => task.id);
  }, [column.tasks]);

  return (
    <div
      className={`flex w-[320px] min-w-[280px] max-w-[340px] shrink-0 flex-col rounded-xl border bg-muted/40 shadow-xs transition-colors ${
        isOver ? 'border-primary/50 ring-2 ring-primary/20 bg-muted/60' : ''
      }`}
    >
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
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2.5 p-3 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[400px] transition-colors rounded-b-xl ${
          isOver ? 'bg-primary/5' : ''
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-card/30 p-6 text-center min-h-[140px]">
              <p className="text-xs font-medium text-muted-foreground">
                Belum ada task
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                Tarik task ke sini untuk memindahkan
              </p>
            </div>
          ) : (
            column.tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                isColumnDone={isDoneColumn}
                onClick={onCardClick}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
