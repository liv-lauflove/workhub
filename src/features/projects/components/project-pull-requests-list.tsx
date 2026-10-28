'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  GitPullRequest,
  GitMerge,
  GitBranch,
  Search,
  X,
  ChevronDown,
  MessageSquare,
  Check,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TaskWithAssignee } from '@/features/kanban/types/kanban.types';
import type { TeamMemberOption } from '@/features/tasks/components/task-assignee-selector';

interface ProjectPullRequestsListProps {
  tasks: TaskWithAssignee[];
  teamMembers: TeamMemberOption[];
  currentUserId?: string;
}

export function isTaskPullRequest(task: TaskWithAssignee): boolean {
  // A task is only considered a Pull Request once a developer has actually
  // opened a PR (test_status is testing, passed, or failed)
  return (
    task.test_status === 'testing' ||
    task.test_status === 'passed' ||
    task.test_status === 'failed'
  );
}

export function isPullRequestOpen(task: TaskWithAssignee): boolean {
  const colName = task.column?.name?.toLowerCase() || '';
  const isDoneCol = colName.includes('done') || colName.includes('selesai');
  return task.test_status !== 'passed' && !isDoneCol;
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'baru saja';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}j lalu`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay}h lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

type SortOption = 'newest' | 'oldest' | 'updated' | 'points' | 'due_date';

export function ProjectPullRequestsList({
  tasks,
  teamMembers,
  currentUserId,
}: ProjectPullRequestsListProps) {
  const [statusTab, setStatusTab] = React.useState<'open' | 'closed'>('open');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [authorFilter, setAuthorFilter] = React.useState<string | null>(null);
  const [reviewerFilter, setReviewerFilter] = React.useState<string | null>(
    null
  );
  const [priorityFilter, setPriorityFilter] = React.useState<string | null>(
    null
  );
  const [sortBy, setSortBy] = React.useState<SortOption>('newest');

  // Filter tasks that are in the Pull Request workflow
  const prTasks = React.useMemo(() => {
    return tasks.filter(isTaskPullRequest);
  }, [tasks]);

  const openCount = React.useMemo(
    () => prTasks.filter((t) => isPullRequestOpen(t)).length,
    [prTasks]
  );
  const closedCount = React.useMemo(
    () => prTasks.filter((t) => !isPullRequestOpen(t)).length,
    [prTasks]
  );

  // Collect authors (developers / creators)
  const uniqueAuthors = React.useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; avatarUrl?: string | null }
    >();
    prTasks.forEach((t) => {
      const dev = t.developer || t.creator;
      if (dev && !map.has(dev.id)) {
        map.set(dev.id, {
          id: dev.id,
          name: dev.full_name,
          avatarUrl: dev.avatar_url,
        });
      }
    });
    return Array.from(map.values());
  }, [prTasks]);

  // Collect reviewers (testers)
  const uniqueReviewers = React.useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; avatarUrl?: string | null }
    >();
    prTasks.forEach((t) => {
      if (t.tester && !map.has(t.tester.id)) {
        map.set(t.tester.id, {
          id: t.tester.id,
          name: t.tester.full_name,
          avatarUrl: t.tester.avatar_url,
        });
      }
    });
    // Also include testers from team members
    teamMembers.forEach((m) => {
      if (m.role === 'tester' && !map.has(m.id)) {
        map.set(m.id, {
          id: m.id,
          name: m.full_name,
          avatarUrl: m.avatar_url,
        });
      }
    });
    return Array.from(map.values());
  }, [prTasks, teamMembers]);

  // Filter PR tasks
  const filteredTasks = React.useMemo(() => {
    return prTasks.filter((t) => {
      // 1. Status Open vs Closed
      const isOpen = isPullRequestOpen(t);
      if (statusTab === 'open' && !isOpen) return false;
      if (statusTab === 'closed' && isOpen) return false;

      // 2. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesBranch = Boolean(
          t.github_branch && t.github_branch.toLowerCase().includes(query)
        );
        const matchesId = t.id.toLowerCase().includes(query);
        const matchesDev = Boolean(
          t.developer?.full_name?.toLowerCase().includes(query)
        );
        const matchesTester = Boolean(
          t.tester?.full_name?.toLowerCase().includes(query)
        );
        if (
          !matchesTitle &&
          !matchesBranch &&
          !matchesId &&
          !matchesDev &&
          !matchesTester
        ) {
          return false;
        }
      }

      // 3. Author filter
      if (authorFilter) {
        const devId = t.developer_id || t.created_by;
        if (devId !== authorFilter) return false;
      }

      // 4. Reviewer filter
      if (reviewerFilter) {
        if (reviewerFilter === 'me') {
          if (!currentUserId || t.tester_id !== currentUserId) return false;
        } else if (t.tester_id !== reviewerFilter) {
          return false;
        }
      }

      // 5. Priority filter
      if (
        priorityFilter &&
        t.priority?.toLowerCase() !== priorityFilter.toLowerCase()
      ) {
        return false;
      }

      return true;
    });
  }, [
    prTasks,
    statusTab,
    searchQuery,
    authorFilter,
    reviewerFilter,
    priorityFilter,
    currentUserId,
  ]);

  // Sort filtered PR tasks
  const sortedTasks = React.useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (sortBy === 'newest') {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (sortBy === 'oldest') {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      if (sortBy === 'updated') {
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      }
      if (sortBy === 'points') {
        return (b.base_points || 0) - (a.base_points || 0);
      }
      if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      return 0;
    });
  }, [filteredTasks, sortBy]);

  const hasActiveFilters = Boolean(
    searchQuery || authorFilter || reviewerFilter || priorityFilter
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setAuthorFilter(null);
    setReviewerFilter(null);
    setPriorityFilter(null);
    setSortBy('newest');
  };

  return (
    <div className="space-y-3">
      {/* Search Bar ala GitHub */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pull request berdasarkan judul, branch, author, atau reviewer..."
            className="pl-9 pr-9 text-xs sm:text-sm bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Semua Filter</span>
          </Button>
        )}
      </div>

      {/* GitHub Pull Requests Box Container */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Table Subheader Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs">
          {/* Status Tabs: Open vs Closed */}
          <div className="flex items-center gap-4 font-semibold">
            <button
              type="button"
              onClick={() => setStatusTab('open')}
              className={`flex items-center gap-1.5 transition-colors ${
                statusTab === 'open'
                  ? 'text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GitPullRequest className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{openCount} Open</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('closed')}
              className={`flex items-center gap-1.5 transition-colors ${
                statusTab === 'closed'
                  ? 'text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GitMerge className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>{closedCount} Closed</span>
            </button>
          </div>

          {/* Filter Dropdowns Ala GitHub */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* 1. Author (Developer) Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={`flex items-center gap-1 font-medium transition-colors ${
                      authorFilter
                        ? 'text-primary font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  />
                }
              >
                <span>Author</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">
                  Filter Berdasarkan Developer
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setAuthorFilter(null)}
                  className="cursor-pointer justify-between"
                >
                  <span>Semua Author</span>
                  {!authorFilter && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {uniqueAuthors.map((author) => (
                  <DropdownMenuItem
                    key={author.id}
                    onClick={() => setAuthorFilter(author.id)}
                    className="cursor-pointer justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {author.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={author.avatarUrl}
                          alt={author.name}
                          className="h-4 w-4 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                          {author.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">{author.name}</span>
                    </div>
                    {authorFilter === author.id && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 2. Reviewer (Tester) Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={`flex items-center gap-1 font-medium transition-colors ${
                      reviewerFilter
                        ? 'text-primary font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  />
                }
              >
                <span>Reviewer</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">
                  Filter Berdasarkan Reviewer / QA
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setReviewerFilter(null)}
                  className="cursor-pointer justify-between"
                >
                  <span>Semua Reviewer</span>
                  {!reviewerFilter && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
                {currentUserId && (
                  <DropdownMenuItem
                    onClick={() => setReviewerFilter('me')}
                    className="cursor-pointer justify-between"
                  >
                    <span>Ditugaskan kepada Saya</span>
                    {reviewerFilter === 'me' && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {uniqueReviewers.map((rev) => (
                  <DropdownMenuItem
                    key={rev.id}
                    onClick={() => setReviewerFilter(rev.id)}
                    className="cursor-pointer justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {rev.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rev.avatarUrl}
                          alt={rev.name}
                          className="h-4 w-4 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                          {rev.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">{rev.name}</span>
                    </div>
                    {reviewerFilter === rev.id && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 3. Priority Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={`flex items-center gap-1 font-medium transition-colors ${
                      priorityFilter
                        ? 'text-primary font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  />
                }
              >
                <span>Priority</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">
                  Filter Tingkat Prioritas
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setPriorityFilter(null)}
                  className="cursor-pointer justify-between"
                >
                  <span>Semua Prioritas</span>
                  {!priorityFilter && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {[
                  { value: 'critical', label: 'Critical', dot: 'bg-rose-500' },
                  { value: 'high', label: 'High', dot: 'bg-amber-500' },
                  { value: 'medium', label: 'Medium', dot: 'bg-sky-500' },
                  { value: 'low', label: 'Low', dot: 'bg-slate-500' },
                ].map((p) => (
                  <DropdownMenuItem
                    key={p.value}
                    onClick={() => setPriorityFilter(p.value)}
                    className="cursor-pointer justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                      <span>{p.label}</span>
                    </div>
                    {priorityFilter === p.value && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 4. Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
                  />
                }
              >
                <ArrowUpDown className="h-3 w-3" />
                <span>Sort</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">
                  Urutan Tampilan
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[
                  { value: 'newest', label: 'Terbaru' },
                  { value: 'oldest', label: 'Terlama' },
                  { value: 'updated', label: 'Baru Diperbarui' },
                  { value: 'points', label: 'Poin Tertinggi' },
                  { value: 'due_date', label: 'Deadline Terdekat' },
                ].map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    onClick={() => setSortBy(s.value as SortOption)}
                    className="cursor-pointer justify-between"
                  >
                    <span>{s.label}</span>
                    {sortBy === s.value && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* PR Items List */}
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[360px] p-12 text-center">
            {statusTab === 'open' ? (
              <GitPullRequest className="h-10 w-10 text-muted-foreground/40 mb-3" />
            ) : (
              <GitMerge className="h-10 w-10 text-muted-foreground/40 mb-3" />
            )}
            <p className="text-sm font-semibold text-foreground">
              {statusTab === 'open'
                ? 'Tidak ada pull request terbuka'
                : 'Tidak ada pull request yang ditutup / di-merge'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              {statusTab === 'open'
                ? 'Ketika developer menyelesaikan pengerjaan coding dan menekan "Buka PR (Open Pull Request)", task akan otomatis masuk ke daftar ini untuk ditinjau oleh QA / Reviewer.'
                : 'Pull request yang telah lolos pengujian QA dan di-merge ke kolom Done akan tampil di sini.'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="mt-4 text-xs"
              >
                Reset Filter
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {sortedTasks.map((task) => {
              const isOpen = isPullRequestOpen(task);
              const isMerged = task.test_status === 'passed';
              const isChangesRequested = task.test_status === 'failed';
              const commentsCount = task.comments?.[0]?.count ?? 0;

              return (
                <div
                  key={task.id}
                  className="group flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Left Section: Status Icon + Title & Badges + Subtitle */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* PR Status Icon */}
                    <div
                      className="pt-0.5 shrink-0"
                      title={
                        isMerged
                          ? 'Pull Request di-merge ke Done'
                          : isChangesRequested
                            ? 'Changes Requested (Perlu Revisi)'
                            : 'Open Pull Request (Menunggu QA)'
                      }
                    >
                      {isMerged ? (
                        <GitMerge className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      ) : isChangesRequested ? (
                        <GitPullRequest className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      ) : (
                        <GitPullRequest className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Title & Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 leading-snug">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="font-semibold text-sm text-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors break-words mr-1"
                        >
                          {task.title}
                        </Link>

                        {/* Git Branch Badge */}
                        {task.github_branch && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono font-medium text-foreground border border-border/80">
                            <GitBranch className="h-3 w-3 text-muted-foreground" />
                            <span>{task.github_branch}</span>
                          </span>
                        )}

                        {/* Reviewer / QA Status Badge */}
                        {isMerged && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                            <GitMerge className="h-2.5 w-2.5" />
                            <span>Merged</span>
                          </span>
                        )}

                        {isChangesRequested && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                            ✕ Changes requested
                          </span>
                        )}

                        {isOpen && !isChangesRequested && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                            ⏳ Review diminta
                          </span>
                        )}

                        {/* Priority Badge */}
                        {task.priority && (
                          <span className="inline-flex items-center rounded-full bg-muted border border-border/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                            {task.priority}
                          </span>
                        )}
                      </div>

                      {/* Subtitle Metadata Ala GitHub PR */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-mono text-[11px] text-muted-foreground/80">
                          #{task.id.slice(0, 7)}
                        </span>
                        <span>·</span>
                        <span>
                          diajukan{' '}
                          {formatRelativeTime(
                            task.updated_at || task.created_at
                          )}{' '}
                          oleh{' '}
                          <strong className="font-medium text-foreground">
                            {task.developer?.full_name ||
                              task.creator?.full_name ||
                              'Developer'}
                          </strong>
                        </span>

                        {task.tester && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <span>Reviewer:</span>
                              <strong className="font-medium text-foreground">
                                {task.tester.full_name}
                              </strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Avatars, Points, & Comments */}
                  <div className="flex items-center gap-3 shrink-0 pt-1">
                    {/* Story Points */}
                    {task.base_points > 0 && (
                      <span className="rounded-md bg-muted/80 border border-border/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {task.base_points} pts
                      </span>
                    )}

                    {/* Developer & Reviewer Avatars */}
                    <div className="flex items-center -space-x-1.5">
                      {task.developer && (
                        <div
                          className="relative"
                          title={`Developer: ${task.developer.full_name}`}
                        >
                          {task.developer.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={task.developer.avatar_url}
                              alt={task.developer.full_name}
                              className="h-5 w-5 rounded-full object-cover ring-2 ring-background"
                            />
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary ring-2 ring-background">
                              {task.developer.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}

                      {task.tester && (
                        <div
                          className="relative"
                          title={`Reviewer (QA): ${task.tester.full_name}`}
                        >
                          {task.tester.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={task.tester.avatar_url}
                              alt={task.tester.full_name}
                              className="h-5 w-5 rounded-full object-cover ring-2 ring-background border border-amber-500/40"
                            />
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-[9px] font-bold text-amber-700 dark:text-amber-400 ring-2 ring-background border border-amber-500/40">
                              {task.tester.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Comments Count */}
                    {commentsCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-medium">
                          {commentsCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
