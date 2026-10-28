'use client';

import Link from 'next/link';
import { Calendar, User, FolderKanban, ArrowRight } from 'lucide-react';
import type { MilestoneWithDetails } from '../types/milestone.types';
import { calculateMilestoneTimeProgress } from '../lib/milestone.utils';

interface MilestoneCardProps {
  milestone: MilestoneWithDetails;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; barClass: string }
> = {
  planned: {
    label: 'Planned',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    barClass: 'bg-muted-foreground/40',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass:
      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    barClass: 'bg-blue-500',
  },
  completed: {
    label: 'Completed',
    badgeClass:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    barClass: 'bg-emerald-500',
  },
  at_risk: {
    label: 'At Risk',
    badgeClass:
      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    barClass: 'bg-rose-500',
  },
};

export function MilestoneCard({ milestone }: MilestoneCardProps) {
  const statusCfg = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.planned;
  const progress = calculateMilestoneTimeProgress(
    milestone.start_date,
    milestone.target_date,
    milestone.status
  );

  const projectCount = milestone.projects?.[0]?.count ?? 0;

  // Determine progress bar fill color: if overdue and not completed, highlight in rose
  const activeBarClass =
    progress.isOverdue && milestone.status !== 'completed'
      ? 'bg-rose-500'
      : statusCfg.barClass;

  return (
    <Link
      href={`/milestones/${milestone.id}`}
      className="group flex flex-col justify-between rounded-xl border bg-card p-5 text-card-foreground shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
    >
      <div className="space-y-3.5">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${statusCfg.badgeClass}`}
          >
            {statusCfg.label}
          </span>

          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <FolderKanban className="h-3.5 w-3.5" />
            <span>
              {projectCount} {projectCount === 1 ? 'Project' : 'Project'}
            </span>
          </span>
        </div>

        {/* Milestone Title & Description */}
        <div>
          <h3 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {milestone.title}
          </h3>
          {milestone.description && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {milestone.description}
            </p>
          )}
        </div>

        {/* Timeline & Progress Section */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              Progres Waktu ({progress.percentage}%)
            </span>
            <span
              className={
                progress.isOverdue && milestone.status !== 'completed'
                  ? 'font-medium text-rose-500'
                  : 'text-muted-foreground'
              }
            >
              {progress.statusText}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${activeBarClass}`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>
              {progress.formattedStartDate} &ndash;{' '}
              {progress.formattedTargetDate}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: PIC and Action Link */}
      <div className="mt-5 flex items-center justify-between border-t pt-3.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 overflow-hidden">
          {milestone.pic?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={milestone.pic.avatar_url}
              alt={milestone.pic.full_name}
              className="h-5 w-5 rounded-full border object-cover shrink-0"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
              <User className="h-3 w-3" />
            </div>
          )}
          <span className="truncate font-medium text-foreground">
            {milestone.pic?.full_name || 'PIC Belum Ditentukan'}
          </span>
        </div>

        <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          <span>Detail</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
