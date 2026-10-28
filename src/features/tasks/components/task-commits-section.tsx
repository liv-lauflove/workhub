'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Copy,
  ExternalLink,
  FolderGit2,
  GitBranch,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { refreshTaskCommitsAction } from '@/features/github/actions/github.actions';
import {
  extractRepositoryFromCommitUrl,
  normalizeGithubRepository,
} from '@/features/github/lib/webhook-verifier';
import type { TaskGithubCommit } from '@/features/github/types/github.types';
import type { TaskDetail } from '../types/task.types';

interface TaskCommitsSectionProps {
  task: TaskDetail;
  initialCommits?: TaskGithubCommit[];
}

const TOUCH_ICON = 'pointer-coarse:size-11';

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'baru saja';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} hari lalu`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} minggu lalu`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} bulan lalu`;
  return `${Math.floor(diffInDays / 365)} tahun lalu`;
}

function formatFullDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/** True when a commit repo ("owner/name") refers to the same repo as the header label. */
function isSameRepo(commitRepo: string, headerRepo: string): boolean {
  const a = commitRepo.toLowerCase();
  const b = normalizeGithubRepository(headerRepo).toLowerCase();
  return a === b || a.endsWith(`/${b}`);
}

function Separator() {
  return <span aria-hidden="true">·</span>;
}

export function TaskCommitsSection({
  task,
  initialCommits = [],
}: TaskCommitsSectionProps) {
  const router = useRouter();
  const [commits, setCommits] =
    React.useState<TaskGithubCommit[]>(initialCommits);
  const [prevInitialCommits, setPrevInitialCommits] =
    React.useState<TaskGithubCommit[]>(initialCommits);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [copiedSha, setCopiedSha] = React.useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = React.useState(false);
  const [expandedCommitIds, setExpandedCommitIds] = React.useState<Set<string>>(
    new Set()
  );

  // Sync prop updates from server revalidation
  if (initialCommits !== prevInitialCommits) {
    setPrevInitialCommits(initialCommits);
    setCommits(initialCommits);
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await refreshTaskCommitsAction(task.id);
      if (res.success && res.commits) {
        setCommits(res.commits);
        toast.success(`Daftar commit diperbarui (${res.commits.length})`);
      } else {
        toast.error(res.error || 'Gagal menyegarkan daftar commit');
        router.refresh();
      }
    } catch {
      toast.error('Gagal menyegarkan daftar commit');
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopySha = async (sha: string) => {
    try {
      await navigator.clipboard.writeText(sha);
      setCopiedSha(sha);
      toast.success('SHA commit disalin');
      setTimeout(() => setCopiedSha(null), 2000);
    } catch {
      toast.error('Gagal menyalin SHA');
    }
  };

  const handleCopyCommand = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCommand(true);
      toast.success('Perintah git disalin');
      setTimeout(() => setCopiedCommand(false), 2000);
    } catch {
      toast.error('Gagal menyalin perintah');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCommitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const branchName = task.github_branch?.trim() || null;
  const configuredRepo = task.github_repo?.trim() || null;

  const distinctCommitRepos = Array.from(
    new Set(
      commits
        .map((c) => extractRepositoryFromCommitUrl(c.url)?.toLowerCase())
        .filter((r): r is string => Boolean(r))
    )
  );
  // Header shows one repo only when it is unambiguous; otherwise each row names its own repo.
  const headerRepo =
    configuredRepo ||
    (distinctCommitRepos.length === 1
      ? extractRepositoryFromCommitUrl(
          commits.find((c) => extractRepositoryFromCommitUrl(c.url))?.url
        )
      : null);

  const pushCommand = branchName ? `git push origin ${branchName}` : '';

  return (
    <section
      aria-labelledby="github-commits-heading"
      className="overflow-hidden rounded-xl border bg-card shadow-xs"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3
            id="github-commits-heading"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Riwayat Commit{' '}
            <span className="font-normal tabular-nums text-muted-foreground">
              ({commits.length})
            </span>
          </h3>

          {(headerRepo || branchName) && (
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {headerRepo && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <FolderGit2
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Repository:</span>
                  <span className="truncate font-mono">{headerRepo}</span>
                </span>
              )}
              {headerRepo && branchName && <Separator />}
              {branchName && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <GitBranch
                    className="size-3.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Branch:</span>
                  <span className="truncate font-mono text-foreground">
                    {branchName}
                  </span>
                </span>
              )}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="pointer-coarse:h-11 pointer-coarse:px-3"
        >
          <RefreshCw
            className={isRefreshing ? 'animate-spin' : undefined}
            aria-hidden="true"
          />
          {isRefreshing ? 'Menyegarkan' : 'Segarkan'}
        </Button>
      </header>

      <p className="sr-only" aria-live="polite">
        {isRefreshing ? 'Menyegarkan daftar commit' : ''}
      </p>

      {commits.length > 0 ? (
        <ul className="divide-y" aria-busy={isRefreshing}>
          {commits.map((commit) => {
            const lines = (commit.commit_message || 'Tanpa pesan commit')
              .trim()
              .split('\n');
            const subject = lines[0];
            const body = lines.slice(1).join('\n').trim();
            const isExpanded = expandedCommitIds.has(commit.id);
            const shortSha = commit.commit_sha.slice(0, 7);
            const isCopied = copiedSha === commit.commit_sha;
            const commitRepo = extractRepositoryFromCommitUrl(commit.url);
            const showRowRepo =
              commitRepo &&
              (!headerRepo || !isSameRepo(commitRepo, headerRepo));
            const bodyId = `commit-body-${commit.id}`;

            return (
              <li key={commit.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="break-words text-sm font-medium leading-snug text-foreground">
                      {subject}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                      {commit.url ? (
                        <a
                          href={commit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-sm font-mono text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                          title="Buka commit di GitHub"
                        >
                          {shortSha}
                          <ExternalLink
                            className="size-3 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="sr-only">(buka di GitHub)</span>
                        </a>
                      ) : (
                        <span className="font-mono text-foreground">
                          {shortSha}
                        </span>
                      )}

                      {commit.author_username && (
                        <>
                          <Separator />
                          <span>@{commit.author_username}</span>
                        </>
                      )}

                      {commit.committed_at && (
                        <>
                          <Separator />
                          <time
                            dateTime={commit.committed_at}
                            title={formatFullDate(commit.committed_at)}
                          >
                            {formatRelativeTime(commit.committed_at)}
                          </time>
                        </>
                      )}

                      {showRowRepo && (
                        <>
                          <Separator />
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <FolderGit2
                              className="size-3 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate font-mono">
                              {commitRepo}
                            </span>
                          </span>
                        </>
                      )}
                    </div>

                    {body && (
                      <>
                        {isExpanded && (
                          <pre
                            id={bodyId}
                            className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed text-foreground"
                          >
                            {body}
                          </pre>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleExpand(commit.id)}
                          aria-expanded={isExpanded}
                          aria-controls={isExpanded ? bodyId : undefined}
                          className="rounded-sm text-xs font-medium text-muted-foreground underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:py-2"
                        >
                          {isExpanded
                            ? 'Sembunyikan pesan lengkap'
                            : 'Lihat pesan lengkap'}
                        </button>
                      </>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleCopySha(commit.commit_sha)}
                    className={`shrink-0 text-muted-foreground ${TOUCH_ICON}`}
                    aria-label={`Salin SHA ${shortSha}`}
                    title={isCopied ? 'Tersalin' : 'Salin SHA lengkap'}
                  >
                    {isCopied ? (
                      <Check className="text-emerald-700 dark:text-emerald-400" />
                    ) : (
                      <Copy />
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : branchName ? (
        <div className="space-y-3 px-5 py-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Belum ada commit tercatat
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Commit akan muncul di sini setelah di-push ke branch{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
                {branchName}
              </code>
              {configuredRepo && (
                <>
                  {' '}
                  di{' '}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
                    {configuredRepo}
                  </code>
                </>
              )}
              .
            </p>
          </div>

          <div className="flex w-fit max-w-full items-center gap-1 rounded-lg border bg-muted/50 py-1 pl-3 pr-1">
            <code className="truncate font-mono text-xs text-foreground">
              {pushCommand}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleCopyCommand(pushCommand)}
              className={`shrink-0 text-muted-foreground ${TOUCH_ICON}`}
              aria-label="Salin perintah git push"
              title="Salin perintah"
            >
              {copiedCommand ? (
                <Check className="text-emerald-700 dark:text-emerald-400" />
              ) : (
                <Copy />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1 px-5 py-6">
          <p className="text-sm font-medium text-foreground">
            Belum ada branch tertaut
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tautkan repository dan branch di panel Development agar commit dari
            GitHub tersinkron otomatis ke task ini.
          </p>
        </div>
      )}
    </section>
  );
}
