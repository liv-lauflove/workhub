'use client';

import { CheckSquare, Shield, Archive, Milestone } from 'lucide-react';
import type { ProjectWithProgress } from '@/features/projects/types/project.types';
import { RestoreButton } from './restore-button';

interface ArchivedProjectCardProps {
  project: ProjectWithProgress;
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
  blocked: {
    label: 'Blocked',
    badgeClass:
      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
};

export function ArchivedProjectCard({
  project,
  isLeader = false,
}: ArchivedProjectCardProps) {
  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planned;

  const formattedArchivedDate = project.archived_at
    ? new Date(project.archived_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Tidak diketahui';

  return (
    <div className="flex flex-col justify-between rounded-xl border bg-card p-5 text-card-foreground shadow-xs opacity-90 hover:opacity-100 transition-opacity">
      <div className="space-y-3.5">
        {/* Top Badges: Status, Team, & Archive Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${statusCfg.badgeClass}`}
            >
              {statusCfg.label}
            </span>

            {project.team && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
                <Shield className="h-3 w-3" />
                <span>Tim {project.team.name}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <Archive className="h-3 w-3" />
              <span>Terarsip</span>
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <CheckSquare className="h-3.5 w-3.5" />
            <span>
              {project.completedTasks}/{project.totalTasks} Task
            </span>
          </span>
        </div>

        {/* Project Name & Description */}
        <div>
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {project.name}
          </h3>
          {project.description && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* Milestone relation & Archived date */}
        <div className="space-y-1.5 pt-1 border-t text-xs text-muted-foreground">
          {project.milestone && (
            <div className="flex items-center gap-1.5">
              <Milestone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">
                Milestone: <strong>{project.milestone.title}</strong>
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 pt-1">
            <Archive className="h-3 w-3 shrink-0" />
            <span>Diarsipkan pada: {formattedArchivedDate}</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      {isLeader && (
        <div className="mt-4 pt-3 border-t flex justify-end">
          <RestoreButton
            type="project"
            id={project.id}
            name={project.name}
            isLeader={isLeader}
          />
        </div>
      )}
    </div>
  );
}
