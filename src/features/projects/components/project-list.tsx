'use client';

import * as React from 'react';
import { Search, FolderKanban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { ProjectCard } from './project-card';
import type { ProjectWithProgress } from '../types/project.types';
import type { PaginationMetadata } from '@/types/global';

interface ProjectListProps {
  projects: ProjectWithProgress[];
  emptyMessage?: string;
  metadata?: PaginationMetadata;
  basePath?: string;
  searchParams?: Record<string, string | undefined>;
}

type StatusFilter = 'all' | 'planned' | 'in_progress' | 'completed' | 'blocked';

export function ProjectList({
  projects,
  emptyMessage = 'Belum ada project yang dibuat.',
  metadata,
  basePath,
  searchParams,
}: ProjectListProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');

  const filteredProjects = React.useMemo(() => {
    return projects.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.team &&
          item.team.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ? true : item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const counts = React.useMemo(() => {
    return {
      all: projects.length,
      planned: projects.filter((p) => p.status === 'planned').length,
      in_progress: projects.filter((p) => p.status === 'in_progress').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      blocked: projects.filter((p) => p.status === 'blocked').length,
    };
  }, [projects]);

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/40 p-12 text-center shadow-xs">
        <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-foreground">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Semua ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'in_progress'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            In Progress ({counts.in_progress})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('planned')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'planned'
                ? 'bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900 shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Planned ({counts.planned})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Completed ({counts.completed})
          </button>

          {counts.blocked > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('blocked')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === 'blocked'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Blocked ({counts.blocked})
            </button>
          )}
        </div>
      </div>

      {/* Grid of Projects */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/40 p-8 text-center">
          <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium text-foreground">
            Tidak ada project yang cocok
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Coba sesuaikan kata kunci pencarian atau filter status.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {metadata && basePath && (
        <Pagination
          metadata={metadata}
          basePath={basePath}
          searchParams={searchParams}
        />
      )}
    </div>
  );
}
