'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  GitMerge,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Send,
  X,
  ShieldAlert,
  Pencil,
  FileText,
  GitBranch,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  requestChangesAction,
  mergePullRequestAction,
} from '../actions/task.actions';
import { TaskOpenPrDialog } from './task-open-pr-dialog';
import type { TaskDetail } from '../types/task.types';
import type { TeamMemberOption } from './task-assignee-selector';

interface TaskPrReviewerBoxProps {
  task: TaskDetail;
  teamMembers?: TeamMemberOption[];
  currentUserId?: string;
  isLeader?: boolean;
}

export function TaskPrReviewerBox({
  task,
  teamMembers = [],
  currentUserId,
  isLeader = false,
}: TaskPrReviewerBoxProps) {
  const router = useRouter();

  const isDoneColumn =
    task.column?.name?.toLowerCase().includes('done') ||
    task.column?.name?.toLowerCase().includes('selesai') ||
    task.column?.name?.toLowerCase().includes('complete');

  const isMerged = task.test_status === 'passed' || isDoneColumn;
  const isChangesRequested = task.test_status === 'failed';
  const isOpenPR =
    !isMerged && !isChangesRequested && task.dev_status === 'dev_done';
  const isDraftDev = !isMerged && !isChangesRequested && !isOpenPR;

  const isReviewer =
    Boolean(currentUserId && task.tester_id === currentUserId) || isLeader;
  const isDeveloper =
    Boolean(
      currentUserId &&
      (task.developer_id === currentUserId ||
        task.assignee_id === currentUserId)
    ) || isLeader;

  // Subtasks statistics
  const subtasks = task.subtasks || [];
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s) => s.is_completed).length;
  const allSubtasksDone =
    totalSubtasks === 0 || completedSubtasks === totalSubtasks;

  // State for Request Changes inline form
  const [isRequestingChanges, setIsRequestingChanges] = React.useState(false);
  const [reviewNotes, setReviewNotes] = React.useState('');
  const [isConfirmingMerge, setIsConfirmingMerge] = React.useState(false);

  // State for Open PR dialog
  const [openPrDialogOpen, setOpenPrDialogOpen] = React.useState(false);

  const [isPending, startTransition] = React.useTransition();

  const handleRequestChanges = () => {
    if (!reviewNotes.trim()) {
      toast.error('Catatan revisi wajib diisi untuk Request Changes.');
      return;
    }

    startTransition(async () => {
      const res = await requestChangesAction({
        taskId: task.id,
        notes: reviewNotes.trim(),
        projectId: task.project_id,
      });

      if (!res.success) {
        toast.error(
          res.error?._form?.[0] || 'Gagal mengirimkan Request Changes.'
        );
        return;
      }

      toast.warning(
        'Changes requested: Status dikembalikan ke Developer untuk perbaikan.'
      );
      setIsRequestingChanges(false);
      setReviewNotes('');
      router.refresh();
    });
  };

  const handleMergePr = () => {
    startTransition(async () => {
      const res = await mergePullRequestAction({
        taskId: task.id,
        projectId: task.project_id,
      });

      if (!res.success) {
        toast.error(
          res.error?._form?.[0] || 'Gagal melakukan Merge Pull Request.'
        );
        return;
      }

      toast.success(
        'Pull Request berhasil dimerge! Task selesai dan poin beban kerja dibebaskan.'
      );
      setIsConfirmingMerge(false);
      router.refresh();
    });
  };

  const testerName = task.tester?.full_name || 'QA Tester';

  return (
    <div className="space-y-4">
      <TaskOpenPrDialog
        task={task}
        teamMembers={teamMembers}
        open={openPrDialogOpen}
        onOpenChange={setOpenPrDialogOpen}
      />

      {/* 1. SCENARIO: PULL REQUEST MERGED & CLOSED */}
      {isMerged && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/[0.04] p-5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-purple-600 p-2.5 text-white shadow-xs shrink-0">
              <GitMerge className="h-5 w-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                Pull request successfully merged and closed
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                You&apos;re all set — seluruh checklist pengujian telah
                diverifikasi lolos oleh{' '}
                <strong className="text-foreground">{testerName}</strong>. Tugas
                telah dipindahkan ke kolom{' '}
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  Done
                </span>{' '}
                dan beban kerja aktif tim telah dibebaskan (0 poin).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. SCENARIO: OPEN PULL REQUEST (READY FOR QA REVIEW) */}
      {isOpenPR && (
        <div className="rounded-xl border border-emerald-500/30 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30 shrink-0">
                <GitPullRequest className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Pull Request Menunggu Peninjauan QA
                </h3>
                <p className="text-xs text-muted-foreground">
                  Reviewer yang ditugaskan:{' '}
                  <strong className="text-foreground font-semibold">
                    {testerName}
                  </strong>
                </p>
              </div>
            </div>

            {/* Checklist Verification Status & Edit PR Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs">
                {allSubtasksDone ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      {totalSubtasks > 0
                        ? `Semua ${totalSubtasks} checklist lolos`
                        : 'Siap diverifikasi'}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      {completedSubtasks} dari {totalSubtasks} checklist selesai
                    </span>
                  </>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenPrDialogOpen(true)}
                className="h-8 gap-1.5 text-xs font-semibold shadow-2xs"
                title="Edit judul, branch, reviewer, dan deskripsi Pull Request"
              >
                <Pencil className="h-3.5 w-3.5 text-primary" />
                <span>Edit PR</span>
              </Button>
            </div>
          </div>

          {/* GitHub Branch Indicator */}
          {task.github_branch && (
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/60">
              <GitBranch className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-sans text-[11px] font-medium text-muted-foreground">
                Branch:
              </span>
              <span className="font-semibold text-foreground">
                {task.github_branch}
              </span>
            </div>
          )}

          {/* PR Description & Testing Guidance Box */}
          {task.test_notes ? (
            <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>Deskripsi Perubahan &amp; Panduan Pengujian QA:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setOpenPrDialogOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Pencil className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {task.test_notes}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 p-4 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Belum ada deskripsi perubahan atau skenario pengujian pada Pull
                Request ini.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenPrDialogOpen(true)}
                className="h-7 text-xs font-semibold gap-1.5 shadow-2xs"
              >
                <Pencil className="h-3.5 w-3.5 text-primary" />
                <span>Tambah Deskripsi &amp; Panduan QA</span>
              </Button>
            </div>
          )}

          {/* Action Decision Area for Reviewer */}
          {isReviewer ? (
            <div className="space-y-4 pt-1">
              {/* Request Changes Form (when toggled) */}
              {isRequestingChanges ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <XCircle className="h-4 w-4" />
                      <span>Catatan Revisi untuk Developer</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRequestingChanges(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <Textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Jelaskan bug yang ditemukan, kriteria penerimaan yang belum lolos, atau petunjuk revisi..."
                    className="text-xs bg-background"
                    disabled={isPending}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRequestingChanges(false)}
                      disabled={isPending}
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleRequestChanges}
                      disabled={isPending}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>Kirim Catatan Revisi</span>
                    </Button>
                  </div>
                </div>
              ) : isConfirmingMerge ? (
                /* Merge Confirmation Box */
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/[0.04] p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <GitMerge className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">
                        Konfirmasi Merge Pull Request
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Tindakan ini akan menandai tugas selesai (Passed QA),
                        memindahkan kartu ke kolom <strong>Done</strong>, dan
                        membebaskan beban kerja tim.
                      </p>
                      {!allSubtasksDone && (
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-1">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            Perhatian: Masih ada{' '}
                            {totalSubtasks - completedSubtasks} subtask
                            checklist yang belum tercentang.
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsConfirmingMerge(false)}
                      disabled={isPending}
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleMergePr}
                      disabled={isPending}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <GitMerge className="h-3.5 w-3.5" />
                      )}
                      <span>Konfirmasi &amp; Merge ke Done</span>
                    </Button>
                  </div>
                </div>
              ) : (
                /* Standard Decision Buttons */
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Sebagai Reviewer, Anda dapat meminta perbaikan atau
                    menyetujui penyelesaian tiket.
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRequestingChanges(true)}
                      className="border-rose-500/30 text-rose-700 hover:bg-rose-500/10 dark:text-rose-400 font-semibold gap-1.5"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Request Changes</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsConfirmingMerge(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 shadow-xs"
                    >
                      <GitMerge className="h-3.5 w-3.5" />
                      <span>Merge Pull Request</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground/70 shrink-0" />
              <span>
                Pull request ini sedang menunggu peninjauan resmi dari{' '}
                <strong className="text-foreground">{testerName}</strong>.
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. SCENARIO: CHANGES REQUESTED (REWORK NEEDED) */}
      {isChangesRequested && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-5 shadow-xs space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-rose-600 p-2.5 text-white shadow-xs shrink-0">
              <XCircle className="h-5 w-5" />
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Changes Requested oleh Reviewer ({testerName})
                </h3>

                {isDeveloper && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setOpenPrDialogOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 text-xs shadow-xs"
                  >
                    <GitPullRequest className="h-3.5 w-3.5" />
                    <span>Ajukan Ulang PR (Re-open PR)</span>
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Terdapat catatan pengujian atau kriteria yang belum terpenuhi.
                Status dikembalikan ke tahap development.
              </p>

              {task.test_notes && (
                <div className="mt-2 rounded-lg border bg-background/80 p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  <strong className="font-semibold text-rose-600 dark:text-rose-400 block mb-1">
                    Catatan Revisi:
                  </strong>
                  {task.test_notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. SCENARIO: DRAFT / IN PROGRESS DEV */}
      {isDraftDev && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/[0.04] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/15 p-2 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30 shrink-0">
              <GitPullRequest className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                Siap untuk penyerahan kode ke QA?
              </h4>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Buka Pull Request untuk merangkum perubahan dan menugaskan
                Reviewer resmi.
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setOpenPrDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 text-xs shadow-xs shrink-0"
          >
            <GitPullRequest className="h-3.5 w-3.5" />
            <span>Open Pull Request (Ajukan QA)</span>
          </Button>
        </div>
      )}
    </div>
  );
}
