import type { Metadata } from 'next';
import { Target, Calendar, UserCheck } from 'lucide-react';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import {
  getMilestones,
  getEligiblePICs,
} from '@/features/milestones/queries/milestone.queries';
import { CreateMilestoneDialog } from '@/features/milestones/components/create-milestone-dialog';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export const metadata: Metadata = {
  title: 'Milestones — Workhub',
  description: 'Target strategis kuartalan dan payung proyek kerja.',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  planned: {
    label: 'Planned',
    className: 'bg-muted text-muted-foreground border-border',
  },
  in_progress: {
    label: 'In Progress',
    className:
      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  completed: {
    label: 'Completed',
    className:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  at_risk: {
    label: 'At Risk',
    className:
      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
};

export default async function MilestonesPage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect(ROUTES.login);
  }

  const isLeader = profile.role === 'leader';
  const milestones = await getMilestones();
  const eligiblePICs = await getEligiblePICs();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Milestones</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Target strategis kuartalan dan tahunan sebagai payung kumpulan
            project tim.
          </p>
        </div>

        <CreateMilestoneDialog
          isLeader={isLeader}
          eligiblePICs={eligiblePICs}
        />
      </div>

      {/* Milestones List or Empty State */}
      {milestones.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center shadow-xs">
          <Target className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-lg font-semibold">Belum Ada Milestone</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Belum ada target strategis yang dibuat.{' '}
            {isLeader
              ? 'Mulai dengan membuat milestone baru melalui tombol di atas.'
              : 'Hubungi leader tim untuk membuat milestone baru.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {milestones.map((milestone) => {
            const statusConfig =
              STATUS_LABELS[milestone.status] || STATUS_LABELS.planned;

            return (
              <div
                key={milestone.id}
                className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-card-foreground line-clamp-2">
                      {milestone.title}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${statusConfig.className}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  {milestone.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {milestone.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 space-y-2.5 border-t pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {milestone.start_date} &rarr; {milestone.target_date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      PIC: {milestone.pic?.full_name || 'Belum ditentukan'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
