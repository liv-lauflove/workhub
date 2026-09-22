'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { Columns3 } from 'lucide-react';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import type {
  BoardColumnWithTasks,
  TaskWithAssignee,
} from '../types/kanban.types';

interface KanbanBoardProps {
  columns: BoardColumnWithTasks[];
  projectId: string;
}

const emptySubscribe = () => () => {};

export function KanbanBoard({ columns: initialColumns }: KanbanBoardProps) {
  const [columns, setColumns] =
    React.useState<BoardColumnWithTasks[]>(initialColumns);
  const [prevInitialColumns, setPrevInitialColumns] =
    React.useState<BoardColumnWithTasks[]>(initialColumns);
  const [activeTask, setActiveTask] = React.useState<TaskWithAssignee | null>(
    null
  );

  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Synchronize internal state when props change without effect setState
  if (initialColumns !== prevInitialColumns) {
    setPrevInitialColumns(initialColumns);
    setColumns(initialColumns);
  }

  // Configure pointer sensor with a 5px threshold so regular clicks aren't intercepted as drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findColumnByTaskId = React.useCallback(
    (taskId: string) => {
      return columns.find((col) => col.tasks.some((t) => t.id === taskId));
    },
    [columns]
  );

  const findColumnById = React.useCallback(
    (columnId: string) => {
      return columns.find((col) => col.id === columnId);
    },
    [columns]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskData = active.data.current?.task as TaskWithAssignee | undefined;

    if (taskData) {
      setActiveTask(taskData);
      return;
    }

    const activeCol = findColumnByTaskId(String(active.id));
    const foundTask = activeCol?.tasks.find((t) => t.id === String(active.id));
    if (foundTask) {
      setActiveTask(foundTask);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const activeCol = findColumnByTaskId(activeId);
    const overCol = findColumnByTaskId(overId) || findColumnById(overId);

    if (!activeCol || !overCol || activeCol.id === overCol.id) {
      return;
    }

    // Move task across columns optimistically in real-time
    setColumns((prev) => {
      const sourceCol = prev.find((col) => col.id === activeCol.id);
      const destCol = prev.find((col) => col.id === overCol.id);
      if (!sourceCol || !destCol) return prev;

      const activeTaskIndex = sourceCol.tasks.findIndex(
        (t) => t.id === activeId
      );
      if (activeTaskIndex === -1) return prev;

      const movingTask: TaskWithAssignee = {
        ...sourceCol.tasks[activeTaskIndex],
        column_id: destCol.id,
      };

      const isOverTask = destCol.tasks.some((t) => t.id === overId);
      let newIndex: number;
      if (isOverTask) {
        const overTaskIndex = destCol.tasks.findIndex((t) => t.id === overId);
        newIndex = overTaskIndex >= 0 ? overTaskIndex : destCol.tasks.length;
      } else {
        newIndex = destCol.tasks.length;
      }

      const newSourceTasks = sourceCol.tasks.filter((t) => t.id !== activeId);
      const newDestTasks = [...destCol.tasks];
      newDestTasks.splice(newIndex, 0, movingTask);

      return prev.map((col) => {
        if (col.id === sourceCol.id) {
          return {
            ...col,
            tasks: newSourceTasks,
            taskCount: newSourceTasks.length,
          };
        }
        if (col.id === destCol.id) {
          return {
            ...col,
            tasks: newDestTasks,
            taskCount: newDestTasks.length,
          };
        }
        return col;
      });
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeCol = findColumnByTaskId(activeId);
    const overCol = findColumnByTaskId(overId) || findColumnById(overId);

    if (!activeCol || !overCol) return;

    if (activeCol.id === overCol.id) {
      const oldIndex = activeCol.tasks.findIndex((t) => t.id === activeId);
      const newIndex = activeCol.tasks.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setColumns((prev) =>
          prev.map((col) => {
            if (col.id === activeCol.id) {
              const reordered = arrayMove(col.tasks, oldIndex, newIndex).map(
                (task, idx) => ({ ...task, position: idx })
              );
              return {
                ...col,
                tasks: reordered,
              };
            }
            return col;
          })
        );
      }
    } else {
      // Re-index both source and destination columns
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === activeCol.id || col.id === overCol.id) {
            return {
              ...col,
              tasks: col.tasks.map((task, idx) => ({
                ...task,
                column_id: col.id,
                position: idx,
              })),
              taskCount: col.tasks.length,
            };
          }
          return col;
        })
      );
    }
  };

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full overflow-x-auto pb-6 pt-2 select-none">
        <div className="flex items-start gap-4 min-w-max">
          {columns.map((column) => (
            <KanbanColumn key={column.id} column={column} />
          ))}
        </div>
      </div>

      {isMounted &&
        createPortal(
          <DragOverlay
            dropAnimation={{
              duration: 200,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}
          >
            {activeTask ? <KanbanCard task={activeTask} isOverlay /> : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
}
