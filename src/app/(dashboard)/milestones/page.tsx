import type { Metadata } from 'next';
import { Target } from 'lucide-react';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import {
  getMilestones,
  getEligiblePICs,
} from '@/features/milestones/queries/milestone.queries';
import { CreateMilestoneDialog } from '@/features/milestones/components/create-milestone-dialog';
import { MilestoneList } from '@/features/milestones/components/milestone-list';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export const metadata: Metadata = {
  title: 'Milestones — Workhub',
  description: 'Target strategis kuartalan dan payung proyek kerja.',
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

      {/* Milestones Content */}
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
        <MilestoneList milestones={milestones} />
      )}
    </div>
  );
}
