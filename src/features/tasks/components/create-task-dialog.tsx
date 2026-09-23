'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Calendar, Flame, User, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createTaskAction } from '../actions/task.actions';
import { toast } from 'sonner';

export interface ColumnOption {
  id: string;
  name: string;
}

export interface MemberOption {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
}

interface CreateTaskDialogProps {
  projectId: string;
  columns: ColumnOption[];
  defaultColumnId?: string;
  teamMembers?: MemberOption[];
  triggerButton?: React.ReactElement;
  onSuccess?: () => void;
}

const PRIORITIES = [
  {
    value: 'low',
    label: 'Low',
    className:
      'border-slate-500/30 text-slate-700 dark:text-slate-300 hover:bg-slate-500/10',
    activeClass:
      'bg-slate-500/20 text-slate-800 dark:text-slate-200 border-slate-500 font-semibold shadow-xs',
  },
  {
    value: 'medium',
    label: 'Medium',
    className:
      'border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10',
    activeClass:
      'bg-sky-500/20 text-sky-800 dark:text-sky-200 border-sky-500 font-semibold shadow-xs',
  },
  {
    value: 'high',
    label: 'High',
    className:
      'border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-500/10',
    activeClass:
      'bg-orange-500/20 text-orange-800 dark:text-orange-200 border-orange-500 font-semibold shadow-xs',
  },
  {
    value: 'critical',
    label: 'Critical',
    className:
      'border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10',
    activeClass:
      'bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500 font-semibold shadow-xs',
  },
] as const;

export function CreateTaskDialog({
  projectId,
  columns = [],
  defaultColumnId,
  teamMembers = [],
  triggerButton,
  onSuccess,
}: CreateTaskDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  // Form State
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [columnId, setColumnId] = React.useState(
    defaultColumnId || columns[0]?.id || ''
  );
  const [priority, setPriority] = React.useState<
    'critical' | 'high' | 'medium' | 'low'
  >('medium');
  const [isCsComplaint, setIsCsComplaint] = React.useState(false);
  const [originNote, setOriginNote] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [assigneeId, setAssigneeId] = React.useState('');
  const [githubBranch, setGithubBranch] = React.useState('');

  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const resetForm = React.useCallback(() => {
    setTitle('');
    setDescription('');
    setColumnId(defaultColumnId || columns[0]?.id || '');
    setPriority('medium');
    setIsCsComplaint(false);
    setOriginNote('');
    setDueDate('');
    setAssigneeId('');
    setGithubBranch('');
    setErrors({});
  }, [defaultColumnId, columns]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    startTransition(async () => {
      const result = await createTaskAction(null, {
        title,
        description,
        projectId,
        columnId,
        priority,
        origin: isCsComplaint ? 'cs_complaint' : 'normal',
        originNote: isCsComplaint ? originNote : undefined,
        dueDate: dueDate || undefined,
        assigneeId: assigneeId || undefined,
        githubBranch: githubBranch || undefined,
      });

      if (!result.success) {
        setErrors(result.error || {});
        const errorMsg =
          result.error?._form?.[0] ||
          result.error?.title?.[0] ||
          'Gagal menambahkan task. Periksa input Anda.';
        toast.error(errorMsg);
      } else {
        toast.success(`Task "${result.data?.title}" berhasil dibuat!`);
        setOpen(false);
        resetForm();
        router.refresh();
        onSuccess?.();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          triggerButton ?? (
            <Button className="flex items-center gap-2 shadow-xs font-medium">
              <Plus className="h-4 w-4" />
              <span>Tambah Task</span>
            </Button>
          )
        }
      />

      {/* Landscape Modal (Max width 4XL with balanced 2-column layout) */}
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              <span>Tambah Task Baru</span>
            </DialogTitle>
            <DialogDescription>
              Buat kartu tugas baru untuk dilacak di papan Kanban project ini.
            </DialogDescription>
          </DialogHeader>

          {/* Form Level Error Alert */}
          {errors._form && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {errors._form[0]}
            </div>
          )}

          {/* 2-Column Landscape Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* SISI KIRI (Col 1-7): Informasi Utama & Detail Task */}
            <div className="lg:col-span-7 space-y-4">
              {/* 1. Title Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="task-title" className="text-xs font-semibold">
                    Judul Task <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {title.length}/100
                  </span>
                </div>
                <Input
                  id="task-title"
                  placeholder="Contoh: Integrasikan gateway pembayaran Midtrans"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                  disabled={isPending}
                  className={
                    errors.title
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }
                />
                {errors.title && (
                  <p className="text-[11px] font-medium text-destructive">
                    {errors.title[0]}
                  </p>
                )}
              </div>

              {/* 2. Description Input (Leluasa 5 baris) */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="task-description"
                  className="text-xs font-semibold"
                >
                  Deskripsi & Kriteria Penyelesaian (Opsional)
                </Label>
                <Textarea
                  id="task-description"
                  placeholder="Tuliskan catatan teknis, kriteria acceptance, atau dependensi task ini..."
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  disabled={isPending}
                  className="resize-none leading-relaxed"
                />
              </div>

              {/* 3. CS Complaint Origin Toggle */}
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isCsComplaint}
                    onChange={(e) => setIsCsComplaint(e.target.checked)}
                    disabled={isPending}
                    className="h-4 w-4 rounded border-input text-rose-600 focus:ring-rose-500"
                  />
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Flame className="h-3.5 w-3.5 text-rose-500" />
                    <span>Berasal dari Keluhan Customer (CS Complaint)</span>
                  </span>
                </label>

                {isCsComplaint && (
                  <div className="space-y-1 pl-6 pt-1">
                    <Input
                      placeholder="Nomor tiket CS atau ringkasan kendala pelanggan..."
                      value={originNote}
                      onChange={(e) => setOriginNote(e.target.value)}
                      maxLength={500}
                      disabled={isPending}
                      className="text-xs h-9"
                    />
                    {errors.originNote && (
                      <p className="text-[11px] font-medium text-destructive">
                        {errors.originNote[0]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SISI KANAN (Col 8-12): Parameter Pengaturan Tugas */}
            <div className="lg:col-span-5 rounded-xl border bg-muted/20 p-4 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">
                Pengaturan Tugas
              </h3>

              {/* Kolom Status Kanban */}
              <div className="space-y-1.5">
                <Label htmlFor="task-column" className="text-xs font-semibold">
                  Kolom Status <span className="text-destructive">*</span>
                </Label>
                <select
                  id="task-column"
                  value={columnId}
                  onChange={(e) => setColumnId(e.target.value)}
                  required
                  disabled={isPending}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
                {errors.columnId && (
                  <p className="text-[11px] font-medium text-destructive">
                    {errors.columnId[0]}
                  </p>
                )}
              </div>

              {/* Penanggung Jawab (Assignee) */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="task-assignee"
                  className="text-xs font-semibold flex items-center gap-1"
                >
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>Penanggung Jawab (PIC)</span>
                </Label>
                <select
                  id="task-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Belum Ditugaskan</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tingkat Prioritas */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Tingkat Prioritas
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRIORITIES.map((p) => {
                    const isSelected = priority === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        disabled={isPending}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs transition-all text-center select-none ${
                          isSelected ? p.activeClass : p.className
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tenggat Waktu (Due Date) */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="task-due-date"
                  className="text-xs font-semibold flex items-center gap-1"
                >
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Tenggat Waktu</span>
                </Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {/* GitHub Branch (Opsional) */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="task-branch"
                  className="text-xs font-semibold flex items-center gap-1"
                >
                  <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>GitHub Branch (Opsional)</span>
                </Label>
                <Input
                  id="task-branch"
                  placeholder="misal: feat/auth-login"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4 gap-2 sm:gap-0">
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isPending}>
                  Batal
                </Button>
              }
            />
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Task</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
