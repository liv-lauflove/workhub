'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CircleDot,
  CheckCircle2,
  Search,
  X,
  ChevronDown,
  Calendar,
  MessageSquare,
  Filter,
  Check,
  User,
  ShieldAlert,
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

interface ProjectIssuesListProps {
  tasks: TaskWithAssignee[];
  teamMembers: TeamMemberOption[];
  columns: { id: string; name: string }[];
  currentUserId?: string;
}

export function isTaskClosed(task: TaskWithAssignee): boolean {
  const colName = task.column?.name?.toLowerCase() || '';
  const isColumnDone =
    colName.includes('done') ||
    colName.includes('selesai') ||
    colName.includes('complete');
  const isDevAndQaDone =
    task.dev_status === 'dev_done' && task.test_status === 'passed';
  return isColumnDone || isDevAndQaDone;
}

function formatRelativeTime(dateStr: string): string {
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

function formatDueDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

function getPriorityBadge(priority?: string) {
  switch (priority?.toLowerCase()) {
    case 'critical':
      return {
        label: 'Critical',
        className:
          'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
      };
    case 'high':
      return {
        label: 'High',
        className:
          'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      };
    case 'medium':
      return {
        label: 'Medium',
        className:
          'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
      };
    case 'low':
      return {
        label: 'Low',
        className:
          'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
      };
    default:
      return null;
  }
}

type SortOption = 'newest' | 'oldest' | 'due_date' | 'points' | 'updated';

export function ProjectIssuesList({
  tasks,
  teamMembers,
  columns,
  currentUserId,
}: ProjectIssuesListProps) {
  const [statusTab, setStatusTab] = React.useState<'open' | 'closed'>('open');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [authorFilter, setAuthorFilter] = React.useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = React.useState<string | null>(
    null
  );
  const [priorityFilter, setPriorityFilter] = React.useState<string | null>(
    null
  );
  const [columnFilter, setColumnFilter] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<SortOption>('newest');

  const todayStr = React.useMemo(
    () => new Date().toISOString().split('T')[0],
    []
  );

  // 1. Calculate status counts
  const openCount = React.useMemo(
    () => tasks.filter((t) => !isTaskClosed(t)).length,
    [tasks]
  );
  const closedCount = React.useMemo(
    () => tasks.filter((t) => isTaskClosed(t)).length,
    [tasks]
  );

  // 2. Extract unique authors
  const uniqueAuthors = React.useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; avatarUrl: string | null }
    >();
    for (const t of tasks) {
      if (t.creator) {
        map.set(t.creator.id, {
          id: t.creator.id,
          name: t.creator.full_name,
          avatarUrl: t.creator.avatar_url,
        });
      }
    }
    return Array.from(map.values());
  }, [tasks]);

  // 3. Reset all active filters
  const hasActiveFilters = Boolean(
    searchQuery ||
    authorFilter ||
    assigneeFilter ||
    priorityFilter ||
    columnFilter ||
    sortBy !== 'newest'
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setAuthorFilter(null);
    setAssigneeFilter(null);
    setPriorityFilter(null);
    setColumnFilter(null);
    setSortBy('newest');
  };

  // 4. Filter tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      // Status open / closed
      const closed = isTaskClosed(t);
      if (statusTab === 'open' && closed) return false;
      if (statusTab === 'closed' && !closed) return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        const matchesId = t.id.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesId) return false;
      }

      // Author filter
      if (authorFilter && t.created_by !== authorFilter) {
        return false;
      }

      // Assignee filter
      if (assigneeFilter) {
        if (assigneeFilter === 'me') {
          if (!currentUserId) return false;
          const isMine =
            t.assignee_id === currentUserId ||
            t.developer_id === currentUserId ||
            t.tester_id === currentUserId;
          if (!isMine) return false;
        } else if (assigneeFilter === 'unassigned') {
          if (t.assignee_id || t.developer_id || t.tester_id) return false;
        } else {
          const matches =
            t.assignee_id === assigneeFilter ||
            t.developer_id === assigneeFilter ||
            t.tester_id === assigneeFilter;
          if (!matches) return false;
        }
      }

      // Priority filter
      if (
        priorityFilter &&
        t.priority?.toLowerCase() !== priorityFilter.toLowerCase()
      ) {
        return false;
      }

      // Column filter
      if (columnFilter && t.column_id !== columnFilter) {
        return false;
      }

      return true;
    });
  }, [
    tasks,
    statusTab,
    searchQuery,
    authorFilter,
    assigneeFilter,
    priorityFilter,
    columnFilter,
    currentUserId,
  ]);

  // 5. Sort filtered tasks
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
      if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      if (sortBy === 'points') {
        return (b.base_points || 0) - (a.base_points || 0);
      }
      if (sortBy === 'updated') {
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      }
      return 0;
    });
  }, [filteredTasks, sortBy]);

  return (
    <div className="space-y-3">
      {/* Search Bar ala GitHub */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari task berdasarkan judul, deskripsi, atau ID..."
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

      {/* GitHub Issues Box Container */}
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
              <CircleDot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
              <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>{closedCount} Closed</span>
            </button>
          </div>

          {/* Filter Dropdowns Ala GitHub */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* 1. Author Filter */}
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
                  Filter Berdasarkan Pembuat
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

            {/* 2. Assignee Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={`flex items-center gap-1 font-medium transition-colors ${
                      assigneeFilter
                        ? 'text-primary font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  />
                }
              >
                <span>Assignee</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">
                  Filter Berdasarkan PIC
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setAssigneeFilter(null)}
                  className="cursor-pointer justify-between"
                >
                  <span>Semua Assignee</span>
                  {!assigneeFilter && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
                {currentUserId && (
                  <DropdownMenuItem
                    onClick={() => setAssigneeFilter('me')}
                    className="cursor-pointer justify-between"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                      <User className="h-3.5 w-3.5" />
                      <span>Ditugaskan ke Saya</span>
                    </div>
                    {assigneeFilter === 'me' && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setAssigneeFilter('unassigned')}
                  className="cursor-pointer justify-between"
                >
                  <span className="text-muted-foreground">
                    Belum Ditugaskan
                  </span>
                  {assigneeFilter === 'unassigned' && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {teamMembers.map((member) => (
                  <DropdownMenuItem
                    key={member.id}
                    onClick={() => setAssigneeFilter(member.id)}
                    className="cursor-pointer justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {member.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="h-4 w-4 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">{member.full_name}</span>
                    </div>
                    {assigneeFilter === member.id && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 3. Priority / Labels Filter */}
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

            {/* 4. Column / Stage Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={`flex items-center gap-1 font-medium transition-colors ${
                      columnFilter
                        ? 'text-primary font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  />
                }
              >
                <span>Stage</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">
                  Filter Kolom / Tahap
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setColumnFilter(null)}
                  className="cursor-pointer justify-between"
                >
                  <span>Semua Tahap</span>
                  {!columnFilter && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {columns.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => setColumnFilter(c.id)}
                    className="cursor-pointer justify-between"
                  >
                    <span>{c.name}</span>
                    {columnFilter === c.id && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 5. Sort Dropdown */}
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
                  { value: 'due_date', label: 'Deadline Terdekat' },
                  { value: 'points', label: 'Poin Tertinggi' },
                  { value: 'updated', label: 'Baru Diperbarui' },
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

        {/* Task Items List */}
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Filter className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-foreground">
              Tidak ada task yang ditemukan
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Tidak ada tiket yang cocok dengan filter atau kriteria pencarian
              yang dipilih saat ini.
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
              const closed = isTaskClosed(task);
              const priority = getPriorityBadge(task.priority);
              const isOverdue = Boolean(
                task.due_date && !closed && task.due_date < todayStr
              );
              const commentsCount = task.comments?.[0]?.count ?? 0;

              return (
                <div
                  key={task.id}
                  className="group flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Left Section: Status Icon + Title & Badges + Subtitle */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Status Icon */}
                    <div
                      className="pt-0.5 shrink-0"
                      title={closed ? 'Selesai / Closed' : 'Terbuka / Open'}
                    >
                      {closed ? (
                        <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <CircleDot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Title & Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 leading-snug">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="font-semibold text-sm text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors break-words mr-1"
                        >
                          {task.title}
                        </Link>

                        {/* Priority Badge */}
                        {priority && (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priority.className}`}
                          >
                            {priority.label}
                          </span>
                        )}

                        {/* Column Badge */}
                        {task.column && (
                          <span className="inline-flex items-center rounded-full bg-muted border border-border/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {task.column.name}
                          </span>
                        )}

                        {/* Dev / QA Status Badges (Dual Track) */}
                        {task.dev_status === 'dev_done' &&
                          task.test_status !== 'passed' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                              ⚡ Siap Diuji (QA)
                            </span>
                          )}

                        {task.test_status === 'passed' && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            ✓ QA Lolos
                          </span>
                        )}

                        {task.test_status === 'failed' && (
                          <span className="inline-flex items-center rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                            ✕ QA Perlu Perbaikan
                          </span>
                        )}

                        {task.origin === 'cs_complaint' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400">
                            <ShieldAlert className="h-2.5 w-2.5" />
                            <span>CS</span>
                          </span>
                        )}
                      </div>

                      {/* Subtitle Metadata */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-mono text-[11px] text-muted-foreground/80">
                          #{task.id.slice(0, 7)}
                        </span>
                        <span>·</span>
                        <span>
                          dibuka {formatRelativeTime(task.created_at)} oleh{' '}
                          <strong className="font-medium text-foreground">
                            {task.creator?.full_name || 'Anggota Tim'}
                          </strong>
                        </span>

                        {task.due_date && (
                          <>
                            <span>·</span>
                            <span
                              className={`inline-flex items-center gap-1 ${
                                isOverdue
                                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                  : ''
                              }`}
                            >
                              <Calendar className="h-3 w-3" />
                              <span>
                                {isOverdue ? 'Terlambat (' : 'Batas '}
                                {formatDueDate(task.due_date)}
                                {isOverdue ? ')' : ''}
                              </span>
                            </span>
                          </>
                        )}

                        {task.base_points > 0 && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-primary/90">
                              {task.base_points} pts
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Avatars & Comments */}
                  <div className="flex items-center gap-3 shrink-0 pt-0.5">
                    {/* Comments Count */}
                    {commentsCount > 0 && (
                      <Link
                        href={`/tasks/${task.id}#comments`}
                        className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title={`${commentsCount} Komentar`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-medium">
                          {commentsCount}
                        </span>
                      </Link>
                    )}

                    {/* Assignee / Dev / Tester Avatars Stack */}
                    <div className="flex items-center -space-x-1.5">
                      {task.developer && (
                        <div
                          title={`Developer: ${task.developer.full_name}`}
                          className="relative ring-2 ring-background rounded-full overflow-hidden"
                        >
                          {task.developer.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={task.developer.avatar_url}
                              alt={task.developer.full_name}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                              {task.developer.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}

                      {task.tester && (
                        <div
                          title={`Tester: ${task.tester.full_name}`}
                          className="relative ring-2 ring-background rounded-full overflow-hidden"
                        >
                          {task.tester.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={task.tester.avatar_url}
                              alt={task.tester.full_name}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/15 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                              {task.tester.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}

                      {!task.developer && !task.tester && task.assignee && (
                        <div
                          title={`PIC: ${task.assignee.full_name}`}
                          className="relative ring-2 ring-background rounded-full overflow-hidden"
                        >
                          {task.assignee.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={task.assignee.avatar_url}
                              alt={task.assignee.full_name}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {task.assignee.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
