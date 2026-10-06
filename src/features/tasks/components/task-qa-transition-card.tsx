'use client';

import * as React from 'react';
import {
  Code2,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Send,
  Loader2,
  Sparkles,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  updateTaskDevStatusAction,
  updateTaskTestStatusAction,
} from '../actions/task.actions';
import type {
  TaskDevStatus,
  TaskTestStatus,
  TaskPurpose,
} from '../types/task.types';

interface TaskQaTransitionCardProps {
  taskId: string;
  projectId?: string | null;
  purpose?: TaskPurpose;
  initialDevStatus?: TaskDevStatus;
  initialTestStatus?: TaskTestStatus;
  initialTestNotes?: string | null;
}

export function TaskQaTransitionCard({
  taskId,
  projectId,
  purpose = 'full_lifecycle',
  initialDevStatus = 'todo',
  initialTestStatus = 'pending',
  initialTestNotes = '',
}: TaskQaTransitionCardProps) {
  const [devStatus, setDevStatus] =
    React.useState<TaskDevStatus>(initialDevStatus);
  const [testStatus, setTestStatus] =
    React.useState<TaskTestStatus>(initialTestStatus);
  const [testNotes, setTestNotes] = React.useState(initialTestNotes || '');
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);

  const [isPendingDev, startTransitionDev] = React.useTransition();
  const [isPendingTest, startTransitionTest] = React.useTransition();

  const handleDevStatusChange = (newStatus: TaskDevStatus) => {
    startTransitionDev(async () => {
      const res = await updateTaskDevStatusAction({
        taskId,
        devStatus: newStatus,
        projectId,
      });

      if (!res.success) {
        const errorMsg =
          res.error?._form?.[0] || 'Gagal memperbarui status development.';
        toast.error(errorMsg);
        return;
      }

      if (res.data) {
        setDevStatus(res.data.devStatus);
        if (res.data.testStatus) {
          setTestStatus(res.data.testStatus);
        }
        if (newStatus === 'dev_done') {
          toast.success(
            'Development selesai! Task otomatis dialihkan ke status Pengujian (Testing).'
          );
        } else {
          toast.success('Status development berhasil diperbarui.');
        }
      }
    });
  };

  const handleTestStatusChange = (newStatus: TaskTestStatus) => {
    startTransitionTest(async () => {
      const res = await updateTaskTestStatusAction({
        taskId,
        testStatus: newStatus,
        testNotes,
        projectId,
      });

      if (!res.success) {
        const errorMsg =
          res.error?._form?.[0] || 'Gagal memperbarui status pengujian.';
        toast.error(errorMsg);
        return;
      }

      if (res.data) {
        setTestStatus(res.data.testStatus);
        if (newStatus === 'passed') {
          toast.success('Task lolos pengujian (Passed QA)!');
        } else if (newStatus === 'failed') {
          toast.warning(
            'Pengujian gagal (Rework diperlukan). Developer akan ditandai.'
          );
        } else {
          toast.success('Status pengujian diperbarui.');
        }
      }
    });
  };

  const handleSaveNotes = () => {
    startTransitionTest(async () => {
      const res = await updateTaskTestStatusAction({
        taskId,
        testStatus,
        testNotes,
        projectId,
      });

      if (!res.success) {
        const errorMsg =
          res.error?._form?.[0] || 'Gagal menyimpan catatan hasil pengujian.';
        toast.error(errorMsg);
        return;
      }

      setIsEditingNotes(false);
      toast.success('Catatan hasil pengujian berhasil disimpan.');
    });
  };

  const isTestingOnly = purpose === 'testing';
  const isDevOnly = purpose === 'development';

  return (
    <div className="rounded-xl border bg-card shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Alur Transisi Dev & Testing (QA)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground capitalize">
            Tujuan: {purpose.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Grid: Developer Track & Tester Track */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Development Track */}
        {!isTestingOnly && (
          <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Code2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Development Track</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  devStatus === 'dev_done'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : devStatus === 'in_progress'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {devStatus.replace('_', ' ')}
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Tandai &apos;Dev Done&apos; saat pengerjaan kode selesai untuk
              secara otomatis menyerahkan task ke tim QA/Tester.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleDevStatusChange('todo')}
                disabled={isPendingDev || devStatus === 'todo'}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  devStatus === 'todo'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                    : 'bg-card border hover:bg-muted text-foreground'
                }`}
              >
                Todo
              </button>
              <button
                type="button"
                onClick={() => handleDevStatusChange('in_progress')}
                disabled={isPendingDev || devStatus === 'in_progress'}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  devStatus === 'in_progress'
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'bg-card border hover:bg-muted text-foreground'
                }`}
              >
                In Progress
              </button>
              <button
                type="button"
                onClick={() => handleDevStatusChange('dev_done')}
                disabled={isPendingDev || devStatus === 'dev_done'}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  devStatus === 'dev_done'
                    ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                    : 'bg-card border hover:bg-muted text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Dev Done → Kirim QA</span>
              </button>
            </div>
          </div>
        )}

        {/* Testing / QA Track */}
        {!isDevOnly && (
          <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Testing Track (QA)</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  testStatus === 'passed'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : testStatus === 'failed'
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                      : testStatus === 'testing'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-muted text-muted-foreground'
                }`}
              >
                {testStatus}
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Verifikasi hasil testing. Bila ada bug/rework, pilih &apos;Failed
              (Rework)&apos; dan tulis catatan di bawah.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleTestStatusChange('pending')}
                disabled={isPendingTest || testStatus === 'pending'}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  testStatus === 'pending'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                    : 'bg-card border hover:bg-muted text-foreground'
                }`}
              >
                <Clock className="h-3 w-3 inline mr-1" />
                Pending
              </button>
              <button
                type="button"
                onClick={() => handleTestStatusChange('testing')}
                disabled={isPendingTest || testStatus === 'testing'}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  testStatus === 'testing'
                    ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                    : 'bg-card border hover:bg-muted text-foreground'
                }`}
              >
                Testing
              </button>
              <button
                type="button"
                onClick={() => handleTestStatusChange('passed')}
                disabled={isPendingTest || testStatus === 'passed'}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  testStatus === 'passed'
                    ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                    : 'bg-card border hover:bg-muted text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Passed (Lolos)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestStatusChange('failed')}
                disabled={isPendingTest || testStatus === 'failed'}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  testStatus === 'failed'
                    ? 'bg-rose-600 text-white font-semibold shadow-2xs'
                    : 'bg-card border hover:bg-muted text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}
              >
                <AlertOctagon className="h-3 w-3" />
                <span>Failed (Rework)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Test Documentation & Notes Section */}
      <div className="rounded-lg border bg-card p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>Dokumentasi Hasil Pengujian (Test Notes / Feedback QA)</span>
          </div>
          {!isEditingNotes && (
            <button
              type="button"
              onClick={() => setIsEditingNotes(true)}
              className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
            >
              {testNotes ? 'Edit Catatan' : '+ Tambah Catatan'}
            </button>
          )}
        </div>

        {isEditingNotes ? (
          <div className="space-y-2 pt-1">
            <textarea
              rows={3}
              value={testNotes}
              onChange={(e) => setTestNotes(e.target.value)}
              placeholder="Tuliskan catatan pengujian, skenario bug jika failed, atau link bukti screenshot..."
              className="w-full rounded-lg border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTestNotes(initialTestNotes || '');
                  setIsEditingNotes(false);
                }}
                disabled={isPendingTest}
                className="rounded-lg border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isPendingTest}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer"
              >
                {isPendingTest ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                <span>Simpan Catatan</span>
              </button>
            </div>
          </div>
        ) : testNotes ? (
          <div className="rounded-lg bg-muted/30 p-2.5 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed border">
            {testNotes}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Belum ada dokumentasi atau catatan pengujian.
          </p>
        )}
      </div>
    </div>
  );
}
