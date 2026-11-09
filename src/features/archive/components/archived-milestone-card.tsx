'use client';

import { Calendar, User, FolderKanban, Archive } from 'lucide-react';
import type { MilestoneWithDetails } from '@/features/milestones/types/milestone.types';
import { RestoreButton } from './restore-button';

interface ArchivedMilestoneCardProps {
  milestone: MilestoneWithDetails;
  isLeader?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  planned: {
    label: 'Planned',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass:
      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  completed: {
    label: 'Completed',
    badgeClass:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  at_risk: {
    label: 'At Risk',
    badgeClass:
      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
};

export function ArchivedMilestoneCard({
  milestone,
  isLeader = false,
}: ArchivedMilestoneCardProps) {
  const statusCfg = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.planned;
  const projectCount = milestone.projects?.[0]?.count ?? 0;

  const formattedArchivedDate = milestone.archived_at
    ? new Date(milestone.archived_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Tidak diketahui';

  const formattedTargetDate = milestone.target_date
    ? new Date(milestone.target_date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '-';

  return (
    <div className="flex flex-col justify-between rounded-xl border bg-card p-5 text-card-foreground shadow-xs opacity-90 hover:opacity-100 transition-opacity">
      <div className="space-y-3.5">
        {/* Top Badges: Status & Projects Count */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${statusCfg.badgeClass}`}
            >
              {statusCfg.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <Archive className="h-3 w-3" />
              <span>Terarsip</span>
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <FolderKanban className="h-3.5 w-3.5" />
            <span>{projectCount} Project</span>
          </span>
        </div>

        {/* Milestone Title & Description */}
        <div>
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {milestone.title}
          </h3>
          {milestone.description && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {milestone.description}
            </p>
          )}
        </div>

        {/* Details & Metadata */}
        <div className="space-y-1.5 pt-1 border-t text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Target: {formattedTargetDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>PIC: {milestone.pic?.full_name || 'Tanpa PIC'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 pt-1">
            <Archive className="h-3 w-3" />
            <span>Diarsipkan pada: {formattedArchivedDate}</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      {isLeader && (
        <div className="mt-4 pt-3 border-t flex justify-end">
          <RestoreButton
            type="milestone"
            id={milestone.id}
            name={milestone.title}
            isLeader={isLeader}
          />
        </div>
      )}
    </div>
  );
}
