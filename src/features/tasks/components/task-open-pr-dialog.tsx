'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  GitPullRequest,
  Loader2,
  GitBranch,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownTaskEditor } from './markdown-task-editor';
import { openPullRequestAction } from '../actions/task.actions';
import type { TaskDetail } from '../types/task.types';
import type { TeamMemberOption } from './task-assignee-selector';

interface TaskOpenPrDialogProps {
  task: TaskDetail;
  teamMembers?: TeamMemberOption[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const DEFAULT_CHANGELOG_TEMPLATE = `### Deskripsi Perubahan
- 

### Panduan & Skenario Pengujian QA
- [ ] 
`;

export function TaskOpenPrDialog({
  task,
  teamMembers = [],
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  onSuccess,
}: TaskOpenPrDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const isEditingPr =
    task.test_status === 'testing' ||
    task.test_status === 'passed' ||
    task.test_status === 'failed';

  const [isChangingReviewer, setIsChangingReviewer] = React.useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTitle(task.title || '');
      setBranch(task.github_branch || '');
      setReviewerId(task.tester_id || task.tester?.id || '');
      setIsChangingReviewer(false);
      if (task.test_notes) {
        setChangelog(task.test_notes);
      }
    }
    if (isControlled) {
      setControlledOpen?.(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
  };

  const [prevTask, setPrevTask] = React.useState(task);
  const [title, setTitle] = React.useState(task.title || '');
  const [branch, setBranch] = React.useState(task.github_branch || '');
  const [reviewerId, setReviewerId] = React.useState(
    task.tester_id || task.tester?.id || ''
  );
  const [changelog, setChangelog] = React.useState(
    task.test_notes || DEFAULT_CHANGELOG_TEMPLATE
  );
  const [isPending, startTransition] = React.useTransition();

  // Sync prop changes during render
  if (task !== prevTask) {
    setPrevTask(task);
    setTitle(task.title || '');
    setBranch(task.github_branch || '');
    setReviewerId(task.tester_id || task.tester?.id || '');
    if (task.test_notes) {
      setChangelog(task.test_notes);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Judul Pull Request wajib diisi.');
      return;
    }

    if (!changelog.trim()) {
      toast.error('Deskripsi perubahan atau panduan pengujian wajib diisi.');
      return;
    }

    startTransition(async () => {
      const res = await openPullRequestAction({
        taskId: task.id,
        title: title.trim(),
        changelog: changelog.trim(),
        reviewerId: reviewerId || null,
        githubBranch: branch.trim() || null,
        projectId: task.project_id,
      });

      if (!res.success) {
        const errorMsg =
          res.error?._form?.[0] || 'Gagal menyimpan Pull Request.';
        toast.error(errorMsg);
        return;
      }

      toast.success(
        isEditingPr
          ? 'Pull Request berhasil diperbarui!'
          : 'Pull Request berhasil diajukan! Tugas siap untuk pengujian QA.'
      );
      handleOpenChange(false);
      router.refresh();
      onSuccess?.();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}

      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <div className="rounded-lg bg-emerald-500/15 p-2 ring-1 ring-emerald-500/30">
                <GitPullRequest className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {isEditingPr
                    ? 'Edit Pull Request'
                    : 'Open Pull Request (Ajukan Pengujian QA)'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isEditingPr
                    ? 'Perbarui judul, branch, reviewer, atau catatan deskripsi & panduan pengujian Pull Request ini.'
                    : 'Rangkum perubahan kode dan ajukan Pull Request ke Tester (Reviewer) resmi.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* GitHub Branch Comparison Pill */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-[11px] font-sans font-medium">base:</span>
              <span className="rounded bg-background px-2 py-0.5 font-semibold text-foreground border shadow-2xs">
                {task.column?.name || 'Review'}
              </span>
            </div>

            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />

            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-[11px] font-sans font-medium">
                compare:
              </span>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs">
                {branch || task.github_branch || 'feature-branch'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* PR Title */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pr-title" className="text-xs font-semibold">
                Judul Pull Request
              </Label>
              <Input
                id="pr-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="cth: feat(auth): integrasi validasi sesi pengguna"
                className="text-xs sm:text-sm font-medium"
                required
                disabled={isPending}
              />
            </div>

            {/* Reviewer / QA */}
            <div className="space-y-1.5">
              <Label
                htmlFor="pr-reviewer"
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                <span>Reviewer (Tester / QA)</span>
              </Label>
              {task.tester && !isChangingReviewer ? (
                <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {task.tester.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={task.tester.avatar_url}
                        alt={task.tester.full_name}
                        className="h-5 w-5 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-700 dark:text-amber-400 shrink-0">
                        {task.tester.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-foreground truncate">
                        {task.tester.full_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Reviewer &amp; QA tester resmi task ini
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsChangingReviewer(true)}
                    className="text-[11px] font-semibold text-primary hover:underline ml-2 shrink-0 cursor-pointer"
                  >
                    Ubah
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <select
                    id="pr-reviewer"
                    value={reviewerId}
                    onChange={(e) => setReviewerId(e.target.value)}
                    disabled={isPending}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Pilih Reviewer (Tester) --</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}{' '}
                        {member.role ? `(${member.role})` : ''}
                      </option>
                    ))}
                  </select>
                  {task.tester && (
                    <button
                      type="button"
                      onClick={() => {
                        setReviewerId(task.tester?.id || '');
                        setIsChangingReviewer(false);
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Batal ubah reviewer
                    </button>
                  )}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Reviewer akan memverifikasi hasil koding &amp; memutuskan Merge
                PR.
              </p>
            </div>

            {/* GitHub Branch Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="pr-branch"
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <GitBranch className="h-3.5 w-3.5 text-primary" />
                <span>Branch GitHub</span>
              </Label>
              <Input
                id="pr-branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="cth: feat/issue-109-pr-workflow"
                className="text-xs sm:text-sm font-mono"
                disabled={isPending}
              />
              <p className="text-[11px] text-muted-foreground">
                Nama branch terkait untuk referensi review kode.
              </p>
            </div>
          </div>

          {/* Markdown Changelog & QA Instructions Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Deskripsi Perubahan &amp; Panduan Pengujian QA (Markdown)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Write &amp; Preview didukung
              </span>
            </div>

            <MarkdownTaskEditor
              value={changelog}
              onChange={setChangelog}
              disabled={isPending}
              minRows={7}
              placeholder="Jelaskan ringkasan perubahan kode, fitur baru, dan checklist langkah pengujian QA..."
            />
          </div>

          <DialogFooter className="border-t pt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {isEditingPr ? 'Menyimpan PR...' : 'Mengajukan PR...'}
                  </span>
                </>
              ) : (
                <>
                  <GitPullRequest className="h-4 w-4" />
                  <span>
                    {isEditingPr
                      ? 'Simpan Perubahan PR'
                      : 'Create Pull Request (Ajukan QA)'}
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
