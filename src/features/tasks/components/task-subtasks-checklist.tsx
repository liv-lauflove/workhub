'use client';

import * as React from 'react';
import {
  CheckSquare2,
  Square,
  Plus,
  Trash2,
  Loader2,
  ShieldCheck,
  X,
  ListPlus,
  ChevronRight,
  ChevronDown,
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

  // Modal / Form state (GitHub Style)
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newDescription, setNewDescription] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Expanded subtask description state
  const [expandedIds, setExpandedIds] = React.useState<Record<string, boolean>>(
    {}
  );

  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Sync if prop changes externally during render
  if (initialSubtasks !== prevInitialSubtasks) {
    setPrevInitialSubtasks(initialSubtasks);
    setSubtasks(initialSubtasks);
  }

  const totalCount = subtasks.length;
  const completedCount = subtasks.filter((s) => s.is_completed).length;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setIsSubmitting(true);
    try {
      // Store description inside title if provided using separator format: "Title\n\nDescription"
      const fullTitle = newDescription.trim()
        ? `${title}\n\n${newDescription.trim()}`
        : title;

      const res = await createTaskSubtaskAction({
        taskId,
        title: fullTitle,
        projectId,
      });

      if (!res.success) {
        toast.error(res.error?._form?.[0] || 'Gagal membuat subtask.');
        return;
      }

      const created = res.data;
      if (created) {
        setSubtasks((prev) => [
          ...prev,
          {
            id: created.id,
            task_id: created.taskId,
            title: created.title,
            is_completed: created.isCompleted,
            sort_order: prev.length,
            tested_by: null,
            tested_at: null,
            created_at: new Date().toISOString(),
          },
        ]);
        setNewTitle('');
        setNewDescription('');
        setIsModalOpen(false);
        toast.success('Subtask berhasil ditambahkan');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (item: TaskSubtask) => {
    const nextCompleted = !item.is_completed;
    setTogglingId(item.id);

    // Optimistic UI update
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
        toast.error(res.error?._form?.[0] || 'Gagal mengubah status subtask.');
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
        toast.error(res.error?._form?.[0] || 'Gagal menghapus subtask.');
        return;
      }

      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
      toast.success('Subtask berhasil dihapus');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      {/* GitHub Subtasks Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Subtasks</span>
          {totalCount > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {completedCount} of {totalCount} completed
            </span>
          )}
        </div>
      </div>

      {/* Subtask Checklist Rows */}
      {subtasks.length > 0 && (
        <div className="rounded-lg border bg-card divide-y overflow-hidden shadow-2xs">
          {subtasks.map((item) => {
            const isToggling = togglingId === item.id;
            const isDeleting = deletingId === item.id;

            // Parse title & description
            const parts = item.title.split('\n\n');
            const mainTitle = parts[0];
            const subDescription = parts.slice(1).join('\n\n');
            const isExpanded = !!expandedIds[item.id];

            return (
              <div
                key={item.id}
                className="group flex flex-col px-3.5 py-2.5 transition-colors hover:bg-muted/40 gap-1.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggle(item)}
                      disabled={isToggling}
                      className="mt-0.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                      title={
                        item.is_completed
                          ? 'Tandai belum selesai'
                          : 'Tandai selesai'
                      }
                    >
                      {isToggling ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : item.is_completed ? (
                        <CheckSquare2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <p
                          className={`text-xs sm:text-sm font-medium leading-snug break-words ${
                            item.is_completed
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          }`}
                        >
                          {mainTitle}
                        </p>

                        {subDescription && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline cursor-pointer"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                <span>Sembunyikan detail</span>
                              </>
                            ) : (
                              <>
                                <ChevronRight className="h-3 w-3" />
                                <span>Lihat deskripsi</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {item.is_completed && item.tested_at && (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3 shrink-0" />
                          <span>
                            Verified{' '}
                            {item.tester ? `by ${item.tester.full_name}` : ''}{' '}
                            on {formatStampDate(item.tested_at)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-600 transition-opacity cursor-pointer shrink-0"
                    title="Hapus subtask"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Subtask Description Content */}
                {subDescription && isExpanded && (
                  <div className="ml-6.5 mt-1 rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap border border-dashed">
                    {subDescription}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* GitHub Style: "Create subtask" Button */}
      <div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Create subtask</span>
        </button>
      </div>

      {/* GitHub "Create new subtask" Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in-0 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-xl border bg-card p-5 shadow-2xl text-card-foreground animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ListPlus className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Create new subtask
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubtask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Add a title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Title subtask..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Add a description
                </label>
                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Type your description or acceptance criteria here..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>Create subtask</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
