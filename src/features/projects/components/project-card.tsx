'use client';

import Link from 'next/link';
import { Users, CheckSquare, User, ArrowRight, Shield } from 'lucide-react';
import type { ProjectWithProgress } from '../types/project.types';

interface ProjectCardProps {
  project: ProjectWithProgress;
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
  blocked: {
    label: 'Blocked',
    badgeClass:
      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    barClass: 'bg-rose-500',
  },
};

export function ProjectCard({ project }: ProjectCardProps) {
  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planned;
  const progressPercent = Math.min(Math.max(project.progress, 0), 100);

  return (
    <div className="group flex flex-col justify-between rounded-xl border bg-card p-5 text-card-foreground shadow-xs transition-all hover:border-primary/50 hover:shadow-md">
      <div className="space-y-3.5">
        {/* Top Badges: Status & Team */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
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
          </div>

          {/* Task Counter */}
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <CheckSquare className="h-3.5 w-3.5" />
            <span>
              {project.completedTasks}/{project.totalTasks} Task
            </span>
          </span>
        </div>

        {/* Project Name & Description */}
        <div>
          <h3 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-1">
            {project.name}
          </h3>
          {project.description && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* Progress Bar Section */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Progres Task</span>
            <span className="font-semibold text-foreground">
              {progressPercent}%
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusCfg.barClass}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Info: PIC & Team Member Count */}
      <div className="mt-4 flex items-center justify-between border-t pt-3.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {/* Team Member Count */}
          <div
            className="flex items-center gap-1"
            title={`${project.memberCount} Anggota Tim`}
          >
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{project.memberCount} Anggota</span>
          </div>

          {/* PIC */}
          <div className="flex items-center gap-1">
            {project.pic?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.pic.avatar_url}
                alt={project.pic.full_name}
                className="h-4 w-4 rounded-full object-cover"
              />
            ) : (
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="truncate max-w-[100px]">
              {project.pic?.full_name || 'Tanpa PIC'}
            </span>
          </div>
        </div>

        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <span>Papan Kanban</span>
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
