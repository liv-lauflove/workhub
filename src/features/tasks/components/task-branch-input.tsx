'use client';

import * as React from 'react';
import {
  GitBranch,
  FolderGit2,
  Pencil,
  Check,
  X,
  Loader2,
  Copy,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateTaskBranchAction } from '../actions/task.actions';
import { normalizeGithubRepository } from '@/features/github/lib/webhook-verifier';

export function GithubIcon({
  className = 'h-3.5 w-3.5',
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

interface TaskBranchInputProps {
  taskId: string;
  initialBranch?: string | null;
  initialRepo?: string | null;
  projectId?: string | null;
  className?: string;
}

export function TaskBranchInput({
  taskId,
  initialBranch,
  initialRepo,
  projectId,
  className = '',
}: TaskBranchInputProps) {
  const [currentBranch, setCurrentBranch] = React.useState(initialBranch || '');
  const [prevInitialBranch, setPrevInitialBranch] =
    React.useState(initialBranch);
  const [branchInput, setBranchInput] = React.useState(initialBranch || '');

  const [currentRepo, setCurrentRepo] = React.useState(initialRepo || '');
  const [prevInitialRepo, setPrevInitialRepo] = React.useState(initialRepo);
  const [repoInput, setRepoInput] = React.useState(initialRepo || '');

  const [isEditing, setIsEditing] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const branchInputRef = React.useRef<HTMLInputElement>(null);

  // Sync state if props change from server revalidation
  if (initialBranch !== prevInitialBranch) {
    setPrevInitialBranch(initialBranch);
    setCurrentBranch(initialBranch || '');
    if (!isEditing) {
      setBranchInput(initialBranch || '');
    }
  }

  if (initialRepo !== prevInitialRepo) {
    setPrevInitialRepo(initialRepo);
    setCurrentRepo(initialRepo || '');
    if (!isEditing) {
      setRepoInput(initialRepo || '');
    }
  }

  // Auto focus branch input when entering edit mode
  React.useEffect(() => {
    if (isEditing && branchInputRef.current) {
      branchInputRef.current.focus();
      branchInputRef.current.select();
    }
  }, [isEditing]);

  const handleCopyBranch = async () => {
    if (!currentBranch) return;
    try {
      await navigator.clipboard.writeText(currentBranch);
      setIsCopied(true);
      toast.success('Nama branch disalin ke clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin ke clipboard');
    }
  };

  const handleSave = () => {
    const trimmedBranch = branchInput.trim();
    const normalizedRepo = normalizeGithubRepository(repoInput);

    if (trimmedBranch === currentBranch && normalizedRepo === currentRepo) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await updateTaskBranchAction({
        taskId,
        githubBranch: trimmedBranch || null,
        githubRepo: normalizedRepo || null,
        projectId,
      });

      if (!result.success) {
        toast.error(
          result.error?._form?.[0] ||
            'Gagal menyimpan konfigurasi GitHub pada task'
        );
        return;
      }

      setCurrentBranch(trimmedBranch);
      setBranchInput(trimmedBranch);
      setCurrentRepo(normalizedRepo);
      setRepoInput(normalizedRepo);
      setIsEditing(false);

      if (trimmedBranch || normalizedRepo) {
        const summary = [
          normalizedRepo ? `Repo: ${normalizedRepo}` : null,
          trimmedBranch ? `Branch: ${trimmedBranch}` : null,
        ]
          .filter(Boolean)
          .join(' • ');
        toast.success(`Konfigurasi GitHub diperbarui (${summary})`);
      } else {
        toast.success('Tautan GitHub telah dihapus');
      }
    });
  };

  const handleClear = () => {
    if (!currentBranch && !currentRepo) return;

    startTransition(async () => {
      const result = await updateTaskBranchAction({
        taskId,
        githubBranch: null,
        githubRepo: null,
        projectId,
      });

      if (!result.success) {
        toast.error(
          result.error?._form?.[0] || 'Gagal menghapus tautan GitHub'
        );
        return;
      }

      setCurrentBranch('');
      setBranchInput('');
      setCurrentRepo('');
      setRepoInput('');
      setIsEditing(false);
      toast.success('Tautan repository & branch GitHub berhasil dihapus');
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setBranchInput(currentBranch);
      setRepoInput(currentRepo);
      setIsEditing(false);
    }
  };

  const hasLinkedConfig = Boolean(currentBranch || currentRepo);
  const repoUrl =
    currentRepo && currentRepo.includes('/')
      ? `https://github.com/${currentRepo}`
      : null;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* View Mode (Branch or Repo is set and not editing) */}
      {!isEditing && hasLinkedConfig ? (
        <div className="space-y-2 pt-1">
          <div className="group relative flex items-start justify-between gap-2 rounded-lg border bg-muted/40 p-2.5 transition-all hover:bg-muted/60">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-background text-foreground shadow-2xs">
                <GithubIcon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 space-y-1">
                {currentRepo && (
                  <div className="flex items-center gap-1.5">
                    <FolderGit2 className="h-3 w-3 text-muted-foreground shrink-0" />
                    {repoUrl ? (
                      <a
                        href={repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 truncate font-mono text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
                        title={`Repository: ${currentRepo}`}
                      >
                        <span className="truncate">{currentRepo}</span>
                        <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                      </a>
                    ) : (
                      <span
                        className="truncate font-mono text-[11px] font-medium text-muted-foreground"
                        title={`Repository: ${currentRepo}`}
                      >
                        {currentRepo}
                      </span>
                    )}
                  </div>
                )}

                {currentBranch ? (
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="h-3 w-3 text-primary shrink-0" />
                    <span
                      className="truncate font-mono text-xs font-semibold text-foreground"
                      title={`Branch: ${currentBranch}`}
                    >
                      {currentBranch}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] italic text-muted-foreground">
                    Belum ada nama branch
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex shrink-0 items-center gap-0.5">
              {currentBranch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyBranch}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Salin nama branch"
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="sr-only">Salin nama branch</span>
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                disabled={isPending}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Ubah repository & branch"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Ubah repository & branch</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                disabled={isPending}
                className="h-7 w-7 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                title="Hapus tautan GitHub"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span className="sr-only">Hapus tautan GitHub</span>
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {currentRepo
              ? `Sinkronisasi commit difilter khusus untuk repo ${currentRepo}.`
              : 'Branch aktif untuk pelacakan kode dan sinkronisasi commit otomatis.'}
          </p>
        </div>
      ) : isEditing ? (
        /* Edit Mode */
        <div className="space-y-2.5 rounded-lg border bg-muted/20 p-2.5 pt-2">
          <div className="space-y-1">
            <label className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span>Repository Target</span>
              <span className="text-[10px] font-normal opacity-75">
                Opsional (Multi-Repo)
              </span>
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-2.5 text-muted-foreground">
                <FolderGit2 className="h-3.5 w-3.5" />
              </span>
              <Input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isPending}
                placeholder="misal: liv-lauflove/workhub atau workhub-fe"
                className="h-8 pl-8 pr-2 text-xs font-mono shadow-2xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground block">
              Nama Branch
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-2.5 text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5" />
              </span>
              <Input
                ref={branchInputRef}
                type="text"
                value={branchInput}
                onChange={(e) => setBranchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isPending}
                placeholder="misal: feat/issue-133-multi-repo"
                className="h-8 pl-8 pr-2 text-xs font-mono shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 pt-0.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setBranchInput(currentBranch);
                setRepoInput(currentRepo);
                setIsEditing(false);
              }}
              disabled={isPending}
              className="h-7 px-2.5 text-xs cursor-pointer"
            >
              <X className="mr-1 h-3 w-3" />
              <span>Batal</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="h-7 px-2.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="mr-1 h-3 w-3" />
                  <span>Simpan</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Tekan{' '}
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Enter</kbd>{' '}
            untuk menyimpan,{' '}
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Esc</kbd>{' '}
            untuk membatalkan.
          </p>
        </div>
      ) : (
        /* Empty State (No branch/repo set, click to add) */
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="group flex w-full items-center justify-between rounded-lg border border-dashed border-border/80 bg-muted/20 p-2.5 text-left text-xs text-muted-foreground hover:border-primary/50 hover:bg-muted/40 hover:text-foreground transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <GithubIcon className="h-3.5 w-3.5" />
              </span>
              <span>Tautkan repo & branch GitHub...</span>
            </div>
            <Pencil className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
          <p className="text-[11px] text-muted-foreground/70">
            Tautkan repository dan branch Git agar riwayat commit terlacak
            akurat tanpa bentrok antar-repo.
          </p>
        </div>
      )}
    </div>
  );
}
