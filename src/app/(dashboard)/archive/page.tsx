import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Archive } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { getArchivedMilestones } from '@/features/milestones/queries/milestone.queries';
import { getArchivedProjects } from '@/features/projects/queries/project.queries';
import { ArchiveView } from '@/features/archive/components/archive-view';
import { ROUTES } from '@/config/routes';

export const metadata: Metadata = {
  title: 'Arsip — Workhub',
  description: 'Daftar milestone dan project yang diarsipkan.',
};

export default async function ArchivePage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect(ROUTES.login);
  }

  const isLeader = profile.role === 'leader';
  const [milestones, projects] = await Promise.all([
    getArchivedMilestones(),
    getArchivedProjects(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Arsip</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Archive className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight">
              Arsip Milestone & Project
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar milestone dan project yang telah selesai atau tidak aktif
            lagi.{' '}
            {isLeader
              ? 'Sebagai Leader, Anda dapat memulihkan item kembali ke daftar aktif.'
              : 'Item dalam arsip bersifat hanya-lihat (view-only).'}
          </p>
        </div>
      </div>

      {/* Interactive Tabs, Filters, & Card Grids */}
      <ArchiveView
        milestones={milestones}
        projects={projects}
        isLeader={isLeader}
      />
    </div>
  );
}
