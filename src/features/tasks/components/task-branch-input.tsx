'use client';

import * as React from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Unlink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

// Touch devices get a 44px hit area; desktop keeps the compact sidebar density.
const TOUCH_SM = 'pointer-coarse:h-11 pointer-coarse:px-3';
const TOUCH_ICON = 'pointer-coarse:size-11';

export function TaskBranchInput({
  taskId,
  initialBranch,
  initialRepo,
  projectId,
  className = '',
}: TaskBranchInputProps) {
  const repoFieldId = React.useId();
  const repoHintId = React.useId();
  const branchFieldId = React.useId();

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

  React.useEffect(() => {
    if (isEditing && branchInputRef.current) {
      branchInputRef.current.focus();
      branchInputRef.current.select();
    }
  }, [isEditing]);

  const cancelEdit = () => {
    setBranchInput(currentBranch);
    setRepoInput(currentRepo);
    setIsEditing(false);
  };

  const handleCopyBranch = async () => {
    if (!currentBranch) return;
    try {
      await navigator.clipboard.writeText(currentBranch);
      setIsCopied(true);
      toast.success('Nama branch disalin');
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
          result.error?._form?.[0] || 'Gagal menyimpan tautan GitHub'
        );
        return;
      }

      setCurrentBranch(trimmedBranch);
      setBranchInput(trimmedBranch);
      setCurrentRepo(normalizedRepo);
      setRepoInput(normalizedRepo);
      setIsEditing(false);

      toast.success(
        trimmedBranch || normalizedRepo
          ? 'Tautan GitHub disimpan'
          : 'Tautan GitHub dilepas'
      );
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
        toast.error(result.error?._form?.[0] || 'Gagal melepas tautan GitHub');
        return;
      }

      setCurrentBranch('');
      setBranchInput('');
      setCurrentRepo('');
      setRepoInput('');
      setIsEditing(false);
      toast.success('Tautan GitHub dilepas');
    });
  };

  const hasLinkedConfig = Boolean(currentBranch || currentRepo);
  const repoUrl = currentRepo.includes('/')
    ? `https://github.com/${currentRepo}`
    : null;

  if (isEditing) {
    return (
      <form
        className={`space-y-3 pt-1 ${className}`}
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor={repoFieldId} className="text-xs">
            Repository{' '}
            <span className="font-normal text-muted-foreground">
              (opsional)
            </span>
          </Label>
          <Input
            id={repoFieldId}
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            disabled={isPending}
            placeholder="owner/repo"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={repoHintId}
            className="font-mono"
          />
          <p id={repoHintId} className="text-xs text-muted-foreground">
            Isi jika project punya lebih dari satu repo. URL GitHub juga
            diterima.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={branchFieldId} className="text-xs">
            Branch
          </Label>
          <Input
            id={branchFieldId}
            ref={branchInputRef}
            type="text"
            value={branchInput}
            onChange={(e) => setBranchInput(e.target.value)}
            disabled={isPending}
            placeholder="feat/issue-123-nama-fitur"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancelEdit}
            disabled={isPending}
            className={TOUCH_SM}
          >
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className={TOUCH_SM}
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Menyimpan
              </>
            ) : (
              'Simpan'
            )}
          </Button>
        </div>
      </form>
    );
  }

  if (!hasLinkedConfig) {
    return (
      <div className={`space-y-2.5 pt-1 ${className}`}>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Belum tertaut ke GitHub. Tautkan branch agar setiap commit tercatat
          otomatis di task ini.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          className={TOUCH_SM}
        >
          <GithubIcon className="size-3.5" />
          Tautkan branch
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 pt-1 ${className}`}>
      <dl className="space-y-2 text-xs">
        <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-2">
          <dt className="text-muted-foreground">Repository</dt>
          <dd className="min-w-0">
            {currentRepo ? (
              repoUrl ? (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative inline-flex max-w-full items-center gap-1 rounded-sm font-mono text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  title={`Buka ${currentRepo} di GitHub`}
                >
                  <span className="truncate">{currentRepo}</span>
                  <ExternalLink
                    className="size-3 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="sr-only">(tab baru)</span>
                </a>
              ) : (
                <span className="block truncate font-mono text-foreground">
                  {currentRepo}
                </span>
              )
            ) : (
              <span
                className="text-muted-foreground"
                title="Commit dari repo mana pun dengan nama branch ini akan masuk ke task"
              >
                Semua repo
              </span>
            )}
          </dd>
        </div>

        <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-2">
          <dt className="text-muted-foreground">Branch</dt>
          <dd className="flex min-w-0 items-center gap-1">
            {currentBranch ? (
              <>
                <code
                  className="truncate rounded-md bg-muted px-1.5 py-0.5 font-mono text-foreground"
                  title={currentBranch}
                >
                  {currentBranch}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCopyBranch}
                  className={`text-muted-foreground ${TOUCH_ICON}`}
                  aria-label="Salin nama branch"
                  title="Salin nama branch"
                >
                  {isCopied ? (
                    <Check className="text-emerald-700 dark:text-emerald-400" />
                  ) : (
                    <Copy />
                  )}
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground">Belum diisi</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          disabled={isPending}
          className={TOUCH_SM}
        >
          <Pencil aria-hidden="true" />
          Ubah
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={isPending}
          className={`text-muted-foreground hover:text-destructive ${TOUCH_SM}`}
        >
          {isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Unlink aria-hidden="true" />
          )}
          Lepas tautan
        </Button>
      </div>
    </div>
  );
}
