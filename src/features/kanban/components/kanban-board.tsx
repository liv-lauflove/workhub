'use client';

import * as React from 'react';
import { KanbanColumn } from './kanban-column';
import type { BoardColumnWithTasks } from '../types/kanban.types';
import { Columns3 } from 'lucide-react';

interface KanbanBoardProps {
  columns: BoardColumnWithTasks[];
  projectId: string;
}

export function KanbanBoard({ columns }: KanbanBoardProps) {
  if (!columns || columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 p-12 text-center shadow-xs">
        <Columns3 className="h-10 w-10 text-muted-foreground/40" />
        <h3 className="mt-3 text-sm font-semibold">Kolom Belum Tersedia</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          Papan Kanban untuk project ini belum memiliki kolom status.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-6 pt-2 select-none">
      <div className="flex items-start gap-4 min-w-max">
        {columns.map((column) => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>
    </div>
  );
}
