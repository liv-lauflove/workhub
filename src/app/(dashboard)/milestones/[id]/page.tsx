import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, User, FolderKanban, Layers } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  getMilestoneById,
  getMilestones,
  getEligiblePICs,
} from '@/features/milestones/queries/milestone.queries';
import { calculateMilestoneTimeProgress } from '@/features/milestones/lib/milestone.utils';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { getTeams } from '@/features/team/queries/team.queries';
import { getProjectsByMilestoneId } from '@/features/projects/queries/project.queries';
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog';
import { ProjectList } from '@/features/projects/components/project-list';
import { ROUTES } from '@/config/routes';

interface MilestoneDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: MilestoneDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const milestone = await getMilestoneById(id);
  if (!milestone) {
    return { title: 'Milestone Tidak Ditemukan — Workhub' };
  }
  return {
    title: `${milestone.title} — Workhub`,
    description: milestone.description || 'Detail target strategis milestone.',
  };
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

export default async function MilestoneDetailPage({
  params,
}: MilestoneDetailPageProps) {
  const { id } = await params;
  const [profile, milestone, teams, eligiblePICs, allMilestones] =
    await Promise.all([
      getUserProfile(),
      getMilestoneById(id),
      getTeams(),
      getEligiblePICs(),
      getMilestones(),
    ]);

  if (!milestone) {
    notFound();
  }

  const isLeader = profile?.role === 'leader';

  const statusCfg = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.planned;
  const progress = calculateMilestoneTimeProgress(
    milestone.start_date,
    milestone.target_date,
    milestone.status
  );

  const projects = await getProjectsByMilestoneId(id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Navigation Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/milestones" />}>
              Milestones
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{milestone.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Milestone Header Banner */}
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.badgeClass}`}
              >
                {statusCfg.label}
              </span>
              <span className="text-xs text-muted-foreground">
                Dibuat{' '}
                {new Date(milestone.created_at).toLocaleDateString('id-ID')}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-card-foreground">
              {milestone.title}
            </h1>
            {milestone.description && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                {milestone.description}
              </p>
            )}
          </div>
        </div>

        {/* Timeline & Schedule Bar */}
        <div className="space-y-2 border-t pt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Progres Waktu ({progress.percentage}%)
            </span>
            <span
              className={
                progress.isOverdue && milestone.status !== 'completed'
                  ? 'font-medium text-rose-500'
                  : 'text-muted-foreground font-medium'
              }
            >
              {progress.statusText}
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress.isOverdue && milestone.status !== 'completed'
                  ? 'bg-rose-500'
                  : statusCfg.barClass
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0 text-primary" />
              <span>
                Rentang: <strong>{progress.formattedStartDate}</strong> &ndash;{' '}
                <strong>{progress.formattedTargetDate}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0 text-primary" />
              <span>
                PIC:{' '}
                <strong className="text-foreground">
                  {milestone.pic?.full_name || 'Belum Ditentukan'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Projects under Milestone Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              Project di Bawah Milestone Ini
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {projects.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={ROUTES.projects(milestone.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              <span>Halaman Khusus Project</span>
            </Link>

            <CreateProjectDialog
              isLeader={isLeader}
              defaultMilestoneId={milestone.id}
              milestones={allMilestones}
              teams={teams}
              eligiblePICs={eligiblePICs}
              userTeamId={profile?.team_id || undefined}
            />
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
            <Layers className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 text-sm font-semibold">Belum Ada Project</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Milestone ini belum memiliki project terkait.{' '}
              {isLeader
                ? 'Mulai dengan menambahkan project baru di bawah milestone ini.'
                : 'Hubungi leader tim untuk menambahkan project baru.'}
            </p>
            {isLeader && (
              <div className="mt-4 flex justify-center">
                <CreateProjectDialog
                  isLeader={isLeader}
                  defaultMilestoneId={milestone.id}
                  milestones={allMilestones}
                  teams={teams}
                  eligiblePICs={eligiblePICs}
                  userTeamId={profile?.team_id || undefined}
                />
              </div>
            )}
          </div>
        ) : (
          <ProjectList projects={projects} />
        )}
      </div>
    </div>
  );
}
