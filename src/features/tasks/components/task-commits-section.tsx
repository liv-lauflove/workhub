'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  GitCommit,
  GitBranch,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { refreshTaskCommitsAction } from '@/features/github/actions/github.actions';
import type { TaskGithubCommit } from '@/features/github/types/github.types';
import type { TaskDetail } from '../types/task.types';

interface TaskCommitsSectionProps {
  task: TaskDetail;
  initialCommits?: TaskGithubCommit[];
}

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
        toast.success(
          `Daftar commit diperbarui (${res.commits.length} commit)`
        );
      } else {
        router.refresh();
      }
    } catch {
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopySha = async (sha: string) => {
    try {
      await navigator.clipboard.writeText(sha);
      setCopiedSha(sha);
      toast.success('Commit SHA disalin ke clipboard');
      setTimeout(() => setCopiedSha(null), 2000);
    } catch {
      toast.error('Gagal menyalin SHA ke clipboard');
    }
  };

  const handleCopyCommand = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCommand(true);
      toast.success('Perintah git disalin ke clipboard');
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

  const branchName = task.github_branch?.trim();

  return (
    <section
      aria-labelledby="github-commits-heading"
      className="rounded-xl border bg-card shadow-xs overflow-hidden"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <GitCommit className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3
              id="github-commits-heading"
              className="text-sm font-semibold text-foreground tracking-tight"
            >
              Riwayat Commit GitHub
            </h3>
            <span className="rounded-full bg-muted border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {commits.length} {commits.length === 1 ? 'Commit' : 'Commits'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {branchName && (
            <div
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border bg-background/80 px-2.5 py-1 text-xs font-mono text-muted-foreground shadow-2xs"
              title={`Branch tertaut: ${branchName}`}
            >
              <GitBranch className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate max-w-[180px]">{branchName}</span>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-2xs"
            title="Segarkan daftar commit"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 sm:p-6">
        {commits.length > 0 ? (
          <div className="space-y-3">
            <ul className="divide-y divide-border/60 rounded-lg border bg-background/50 overflow-hidden">
              {commits.map((commit) => {
                const lines = (commit.commit_message || 'No commit message')
                  .trim()
                  .split('\n');
                const subject = lines[0];
                const body = lines.slice(1).join('\n').trim();
                const isExpanded = expandedCommitIds.has(commit.id);
                const shortSha = commit.commit_sha.slice(0, 7);
                const isCopied = copiedSha === commit.commit_sha;

                return (
                  <li
                    key={commit.id}
                    className="p-3.5 sm:p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      {/* Left: Message, Body, & Metadata */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <GitCommit className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug break-words">
                              {subject}
                            </p>

                            {body && (
                              <div className="mt-1">
                                {isExpanded ? (
                                  <pre className="mt-1.5 rounded-md bg-muted/60 p-2.5 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed border">
                                    {body}
                                  </pre>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(commit.id)}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline mt-1 cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-3 w-3" />
                                      <span>Sembunyikan rincian</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3" />
                                      <span>Lihat pesan lengkap</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Meta info: Author & Committed date */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-6 text-[11px] text-muted-foreground">
                          {commit.author_username && (
                            <span className="font-medium text-foreground">
                              @{commit.author_username}
                            </span>
                          )}
                          <span>•</span>
                          <span
                            title={formatFullDate(commit.committed_at)}
                            className="cursor-help underline decoration-dotted underline-offset-2"
                          >
                            {formatRelativeTime(commit.committed_at)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Commit SHA & External Link Actions */}
                      <div className="flex items-center gap-1.5 self-start shrink-0 pl-6 sm:pl-0">
                        {/* Short SHA pill with copy button */}
                        <div className="inline-flex items-center rounded-md border bg-card px-2 py-1 font-mono text-xs text-foreground shadow-2xs">
                          <span>{shortSha}</span>
                          <button
                            type="button"
                            onClick={() => handleCopySha(commit.commit_sha)}
                            className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title={
                              isCopied
                                ? 'Tersalin!'
                                : `Salin SHA (${commit.commit_sha})`
                            }
                            aria-label={`Salin SHA commit ${shortSha}`}
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        {/* External link to GitHub commit */}
                        {commit.url ? (
                          <a
                            href={commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md border bg-card p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs"
                            title="Buka commit di GitHub"
                            aria-label={`Buka commit ${shortSha} di GitHub`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : branchName ? (
          /* Empty state: Branch registered but no commits yet */
          <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <GitCommit className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-sm font-semibold text-foreground">
                Belum Ada Commit Tercatat
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Task ini terhubung ke branch{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground font-semibold">
                  {branchName}
                </code>
                . Setiap commit yang di-push ke GitHub akan otomatis muncul di
                sini.
              </p>
            </div>

            {/* Helper push command box */}
            <div className="pt-2 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-lg border bg-background/80 px-3 py-1.5 text-xs font-mono text-muted-foreground shadow-2xs max-w-full overflow-x-auto">
                <Terminal className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-foreground">
                  git push origin {branchName}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyCommand(`git push origin ${branchName}`)
                  }
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Salin perintah git push"
                  aria-label="Salin perintah git push"
                >
                  {copiedCommand ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state: No branch registered yet */
          <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <GitBranch className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-sm font-semibold text-foreground">
                Belum Ada Branch Git Ditautkan
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tautkan nama branch pengerjaan pada seksi{' '}
                <strong className="text-foreground font-medium">
                  Development
                </strong>{' '}
                di sidebar kanan agar riwayat commit GitHub otomatis
                disinkronkan ke task ini.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
