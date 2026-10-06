'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Loader2,
  ListTodo,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createTaskSubtaskAction,
  toggleTaskSubtaskAction,
  deleteTaskSubtaskAction,
} from '../actions/task.actions';
import type { TaskSubtask } from '../types/task.types';

interface TaskSubtasksChecklistProps {
  taskId: string;
  projectId?: string | null;
  initialSubtasks?: TaskSubtask[];
}

function formatStampDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function TaskSubtasksChecklist({
  taskId,
  projectId,
  initialSubtasks = [],
}: TaskSubtasksChecklistProps) {
  const [prevInitialSubtasks, setPrevInitialSubtasks] =
    React.useState<TaskSubtask[]>(initialSubtasks);
  const [subtasks, setSubtasks] =
    React.useState<TaskSubtask[]>(initialSubtasks);
  const [newTitle, setNewTitle] = React.useState('');
  const [isAdding, setIsAdding] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Sync if prop changes externally during render
  if (initialSubtasks !== prevInitialSubtasks) {
    setPrevInitialSubtasks(initialSubtasks);
    setSubtasks(initialSubtasks);
  }

  const totalCount = subtasks.length;
  const completedCount = subtasks.filter((s) => s.is_completed).length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setIsAdding(true);
    try {
      const res = await createTaskSubtaskAction({
        taskId,
        title,
        projectId,
      });

      if (!res.success) {
        const errorMsg =
          res.error?._form?.[0] || 'Gagal menambahkan subtask checklist.';
        toast.error(errorMsg);
        return;
      }

      const createdItem = res.data;
      if (createdItem) {
        setSubtasks((prev) => [
          ...prev,
          {
            id: createdItem.id,
            task_id: createdItem.taskId,
            title: createdItem.title,
            is_completed: createdItem.isCompleted,
            sort_order: prev.length,
            tested_by: null,
            tested_at: null,
            created_at: new Date().toISOString(),
          },
        ]);
        setNewTitle('');
        toast.success('Subtask checklist berhasil ditambahkan');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (item: TaskSubtask) => {
    const nextCompleted = !item.is_completed;
    setTogglingId(item.id);

    // Optimistic update
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === item.id
          ? {
              ...s,
              is_completed: nextCompleted,
              tested_at: nextCompleted ? new Date().toISOString() : null,
            }
          : s
      )
    );

    try {
      const res = await toggleTaskSubtaskAction({
        subtaskId: item.id,
        taskId,
        isCompleted: nextCompleted,
        projectId,
      });

      if (!res.success) {
        // Rollback
        setSubtasks((prev) => prev.map((s) => (s.id === item.id ? item : s)));
        const errorMsg =
          res.error?._form?.[0] || 'Gagal mengubah status subtask.';
        toast.error(errorMsg);
        return;
      }

      const updated = res.data;
      if (updated) {
        setSubtasks((prev) =>
          prev.map((s) =>
            s.id === item.id
              ? {
                  ...s,
                  is_completed: updated.isCompleted,
                  tested_by: updated.testedBy,
                  tested_at: updated.testedAt,
                }
              : s
          )
        );
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (subtaskId: string) => {
    setDeletingId(subtaskId);
    try {
      const res = await deleteTaskSubtaskAction({
        subtaskId,
        taskId,
        projectId,
      });

      if (!res.success) {
        const errorMsg =
          res.error?._form?.[0] || 'Gagal menghapus subtask checklist.';
        toast.error(errorMsg);
        return;
      }

      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
      toast.success('Subtask berhasil dihapus');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
      {/* Header with Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Subtask Checklist & Kriteria Pengujian (QA)
          </h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {completedCount}/{totalCount}
          </span>
        </div>

        {totalCount > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-28 sm:w-36 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground w-8 text-right">
              {progressPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Subtasks List */}
      <div className="divide-y divide-border/60">
        {subtasks.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground italic">
            Belum ada subtask checklist. Tambahkan kriteria pengerjaan atau
            testing di bawah.
          </div>
        ) : (
          subtasks.map((item) => {
            const isToggling = togglingId === item.id;
            const isDeleting = deletingId === item.id;

            return (
              <div
                key={item.id}
                className={`group flex items-start justify-between gap-3 p-3 sm:px-4 transition-colors hover:bg-muted/30 ${
                  item.is_completed ? 'bg-muted/15' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    disabled={isToggling}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    title={
                      item.is_completed
                        ? 'Tandai belum selesai'
                        : 'Tandai selesai diuji'
                    }
                  >
                    {isToggling ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : item.is_completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <p
                      className={`text-xs sm:text-sm font-medium leading-relaxed break-words ${
                        item.is_completed
                          ? 'text-muted-foreground line-through'
                          : 'text-foreground'
                      }`}
                    >
                      {item.title}
                    </p>

                    {item.is_completed && item.tested_at && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck className="h-3 w-3 shrink-0" />
                        <span>
                          Diuji & diverifikasi{' '}
                          {item.tester ? `oleh ${item.tester.full_name}` : ''}{' '}
                          pada {formatStampDate(item.tested_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={isDeleting}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-600 transition-opacity cursor-pointer shrink-0"
                  title="Hapus checklist"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Subtask Form */}
      <form
        onSubmit={handleAddSubtask}
        className="flex items-center gap-2 border-t bg-card p-3 sm:px-4"
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Tambah item checklist / kriteria pengujian baru..."
          disabled={isAdding}
          className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <button
          type="submit"
          disabled={isAdding || !newTitle.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isAdding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          <span>Tambah</span>
        </button>
      </form>
    </div>
  );
}
