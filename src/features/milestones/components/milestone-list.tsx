'use client';

import * as React from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MilestoneCard } from './milestone-card';
import type { MilestoneWithDetails } from '../types/milestone.types';

interface MilestoneListProps {
  milestones: MilestoneWithDetails[];
}

type StatusFilter = 'all' | 'in_progress' | 'planned' | 'at_risk' | 'completed';

export function MilestoneList({ milestones }: MilestoneListProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');

  const filteredMilestones = React.useMemo(() => {
    return milestones.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ? true : item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [milestones, searchQuery, statusFilter]);

  const counts = React.useMemo(() => {
    return {
      all: milestones.length,
      in_progress: milestones.filter((m) => m.status === 'in_progress').length,
      planned: milestones.filter((m) => m.status === 'planned').length,
      at_risk: milestones.filter((m) => m.status === 'at_risk').length,
      completed: milestones.filter((m) => m.status === 'completed').length,
    };
  }, [milestones]);

  if (milestones.length === 0) {
    return null; // Parent page renders main empty state
  }

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari milestone..."
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
            onClick={() => setStatusFilter('at_risk')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'at_risk'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            At Risk ({counts.at_risk})
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
        </div>
      </div>

      {/* Grid List */}
      {filteredMilestones.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center">
          <Filter className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium">
            Tidak ada milestone yang sesuai dengan pencarian atau filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMilestones.map((milestone) => (
            <MilestoneCard key={milestone.id} milestone={milestone} />
          ))}
        </div>
      )}
    </div>
  );
}
