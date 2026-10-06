'use client';

import * as React from 'react';
import {
  Code2,
  CheckCircle2,
  ChevronDown,
  Loader2,
  FileText,
  Check,
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

interface TaskDevTestControlsProps {
  taskId: string;
  projectId?: string | null;
  purpose?: TaskPurpose;
  initialDevStatus?: TaskDevStatus;
  initialTestStatus?: TaskTestStatus;
  initialTestNotes?: string | null;
}

const DEV_STATUS_CONFIG: Record<
  TaskDevStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  todo: {
    label: 'Todo (Dev)',
    badgeClass:
      'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
    dotClass: 'bg-zinc-500',
  },
  in_progress: {
    label: 'In Progress (Dev)',
    badgeClass:
      'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
    dotClass: 'bg-blue-500',
  },
  dev_done: {
    label: 'Dev Done (Siap QA)',
    badgeClass:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    dotClass: 'bg-emerald-500',
  },
};

const TEST_STATUS_CONFIG: Record<
  TaskTestStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  pending: {
    label: 'Pending (QA)',
    badgeClass:
      'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
    dotClass: 'bg-zinc-500',
  },
  testing: {
    label: 'Testing (Sedang Uji)',
    badgeClass:
      'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    dotClass: 'bg-amber-500',
  },
  passed: {
    label: 'Passed (Lolos QA)',
    badgeClass:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    dotClass: 'bg-emerald-500',
  },
  failed: {
    label: 'Failed (Rework)',
    badgeClass:
      'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
    dotClass: 'bg-rose-500',
  },
};

export function TaskDevTestControls({
  taskId,
  projectId,
  purpose = 'full_lifecycle',
  initialDevStatus = 'todo',
  initialTestStatus = 'pending',
  initialTestNotes = '',
}: TaskDevTestControlsProps) {
  const [devStatus, setDevStatus] =
    React.useState<TaskDevStatus>(initialDevStatus);
  const [testStatus, setTestStatus] =
    React.useState<TaskTestStatus>(initialTestStatus);
  const [testNotes, setTestNotes] = React.useState(initialTestNotes || '');
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);

  const [devOpen, setDevOpen] = React.useState(false);
  const [testOpen, setTestOpen] = React.useState(false);

  const [isPendingDev, startTransitionDev] = React.useTransition();
  const [isPendingTest, startTransitionTest] = React.useTransition();

  const devRef = React.useRef<HTMLDivElement>(null);
  const testRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (devRef.current && !devRef.current.contains(event.target as Node)) {
        setDevOpen(false);
      }
      if (testRef.current && !testRef.current.contains(event.target as Node)) {
        setTestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDevChange = (next: TaskDevStatus) => {
    setDevOpen(false);
    startTransitionDev(async () => {
      const res = await updateTaskDevStatusAction({
        taskId,
        devStatus: next,
        projectId,
      });

      if (!res.success) {
        toast.error(
          res.error?._form?.[0] || 'Gagal mengubah status development'
        );
        return;
      }

      if (res.data) {
        setDevStatus(res.data.devStatus);
        if (res.data.testStatus) {
          setTestStatus(res.data.testStatus);
        }
        if (next === 'dev_done') {
          toast.success(
            'Development selesai! Status testing otomatis dimulai.'
          );
        } else {
          toast.success('Status development diperbarui.');
        }
      }
    });
  };

  const handleTestChange = (next: TaskTestStatus) => {
    setTestOpen(false);
    startTransitionTest(async () => {
      const res = await updateTaskTestStatusAction({
        taskId,
        testStatus: next,
        testNotes,
        projectId,
      });

      if (!res.success) {
        toast.error(res.error?._form?.[0] || 'Gagal mengubah status testing');
        return;
      }

      if (res.data) {
        setTestStatus(res.data.testStatus);
        if (next === 'passed') {
          toast.success('Task lolos pengujian (Passed QA)');
        } else if (next === 'failed') {
          toast.warning('Pengujian gagal (Rework diperlukan)');
          setIsEditingNotes(true);
        } else {
          toast.success('Status testing diperbarui.');
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
        toast.error(
          res.error?._form?.[0] || 'Gagal menyimpan catatan pengujian'
        );
        return;
      }

      setIsEditingNotes(false);
      toast.success('Catatan pengujian berhasil disimpan');
    });
  };

  const isTestingOnly = purpose === 'testing';
  const isDevOnly = purpose === 'development';

  return (
    <div className="space-y-3 pt-1">
      {/* Dev Status Dropdown */}
      {!isTestingOnly && (
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Code2 className="h-3 w-3 text-blue-500" />
              <span>Status Development</span>
            </span>
          </label>

          <div className="relative" ref={devRef}>
            <button
              type="button"
              onClick={() => setDevOpen(!devOpen)}
              disabled={isPendingDev}
              className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-muted/60 cursor-pointer ${
                DEV_STATUS_CONFIG[devStatus]?.badgeClass || 'bg-background'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    DEV_STATUS_CONFIG[devStatus]?.dotClass || 'bg-zinc-400'
                  }`}
                />
                <span className="truncate">
                  {DEV_STATUS_CONFIG[devStatus]?.label}
                </span>
              </div>
              {isPendingDev ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </button>

            {devOpen && (
              <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                {(['todo', 'in_progress', 'dev_done'] as TaskDevStatus[]).map(
                  (status) => {
                    const cfg = DEV_STATUS_CONFIG[status];
                    const isSelected = devStatus === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleDevChange(status)}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-accent font-semibold text-accent-foreground'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${cfg.dotClass}`}
                          />
                          <span>{cfg.label}</span>
                        </div>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Status Dropdown */}
      {!isDevOnly && (
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>Status Testing (QA)</span>
            </span>
          </label>

          <div className="relative" ref={testRef}>
            <button
              type="button"
              onClick={() => setTestOpen(!testOpen)}
              disabled={isPendingTest}
              className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-muted/60 cursor-pointer ${
                TEST_STATUS_CONFIG[testStatus]?.badgeClass || 'bg-background'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    TEST_STATUS_CONFIG[testStatus]?.dotClass || 'bg-zinc-400'
                  }`}
                />
                <span className="truncate">
                  {TEST_STATUS_CONFIG[testStatus]?.label}
                </span>
              </div>
              {isPendingTest ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </button>

            {testOpen && (
              <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                {(
                  ['pending', 'testing', 'passed', 'failed'] as TaskTestStatus[]
                ).map((status) => {
                  const cfg = TEST_STATUS_CONFIG[status];
                  const isSelected = testStatus === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleTestChange(status)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-accent font-semibold text-accent-foreground'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${cfg.dotClass}`}
                        />
                        <span>{cfg.label}</span>
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QA Test Notes / Feedback Dropdown or Box */}
      {!isDevOnly && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>Catatan QA / Hasil Uji</span>
            </span>
            {!isEditingNotes && (
              <button
                type="button"
                onClick={() => setIsEditingNotes(true)}
                className="text-primary hover:underline cursor-pointer"
              >
                {testNotes ? 'Edit' : '+ Tambah'}
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-1.5">
              <textarea
                rows={2}
                value={testNotes}
                onChange={(e) => setTestNotes(e.target.value)}
                placeholder="Catatan skenario lolos atau bug..."
                className="w-full rounded-lg border bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(false)}
                  disabled={isPendingTest}
                  className="rounded px-2 py-0.5 text-[11px] border hover:bg-muted text-muted-foreground cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isPendingTest}
                  className="rounded bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-50"
                >
                  Simpan
                </button>
              </div>
            </div>
          ) : testNotes ? (
            <p className="rounded-lg bg-muted/40 p-2 text-[11px] text-foreground/90 whitespace-pre-wrap border leading-relaxed">
              {testNotes}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
