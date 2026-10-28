import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FolderKanban, Target, Layers, ArrowLeft } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import {
  getMilestones,
  getMilestoneById,
  getEligiblePICs,
} from '@/features/milestones/queries/milestone.queries';
import { getTeams } from '@/features/team/queries/team.queries';
import {
  getProjectsByMilestoneId,
  getProjects,
} from '@/features/projects/queries/project.queries';
import { ProjectList } from '@/features/projects/components/project-list';
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog';
import { ROUTES } from '@/config/routes';

interface ProjectsPageProps {
  searchParams: Promise<{ milestone_id?: string; page?: string }>;
}

export async function generateMetadata({
  searchParams,
}: ProjectsPageProps): Promise<Metadata> {
  const { milestone_id } = await searchParams;
  if (milestone_id) {
    const milestone = await getMilestoneById(milestone_id);
    if (milestone) {
      return {
        title: `Project: ${milestone.title} — Workhub`,
        description: `Daftar project di bawah milestone ${milestone.title}.`,
      };
    }
  }
  return {
    title: 'Daftar Project — Workhub',
    description: 'Daftar seluruh project kerja tim di bawah target milestone.',
  };
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const profile = await getUserProfile();

  if (!profile) {
    redirect(ROUTES.login);
  }

  const { milestone_id, page: rawPage } = await searchParams;
  const currentPage = Math.max(1, Number(rawPage) || 1);
  const isLeader = profile.role === 'leader';

  const [teams, eligiblePICs, allMilestones] = await Promise.all([
    getTeams(),
    getEligiblePICs(),
    getMilestones(),
  ]);

  // Case 1: Specific milestone_id parameter provided in URL
  if (milestone_id) {
    const milestone = await getMilestoneById(milestone_id);

    // Strict isolation: only fetch projects belonging to this milestone with pagination
    const { data: projects, metadata } = await getProjectsByMilestoneId(
      milestone_id,
      { page: currentPage }
    );

    return (
      <div className="mx-auto max-w-6xl space-y-6">
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
            {milestone ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    render={<Link href={`/milestones/${milestone.id}`} />}
                  >
                    {milestone.title}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Project</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>Project</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Back navigation link to Milestone */}
        {milestone && (
          <div>
            <Link
              href={`/milestones/${milestone.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Detail Milestone ({milestone.title})</span>
            </Link>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <FolderKanban className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">
                {milestone ? `Project: ${milestone.title}` : 'Daftar Project'}
              </h1>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {metadata.total} Project
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {milestone?.description ||
                'Kelola seluruh project kerja tim yang terikat di bawah milestone ini.'}
            </p>
          </div>

          <CreateProjectDialog
            isLeader={isLeader}
            defaultMilestoneId={milestone?.id || milestone_id}
            milestones={allMilestones}
            teams={teams}
            eligiblePICs={eligiblePICs}
            userTeamId={profile.team_id || undefined}
          />
        </div>

        {/* Projects Content / Isolation Guard */}
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/40 p-12 text-center shadow-xs">
            <Layers className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h2 className="mt-4 text-lg font-semibold">
              Belum Ada Project di Milestone Ini
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {milestone
                ? `Milestone "${milestone.title}" belum memiliki project terkait.`
                : 'Tidak ada project yang terhubung dengan ID milestone ini.'}{' '}
              {isLeader
                ? 'Gunakan tombol di atas untuk membuat project baru.'
                : 'Hubungi leader tim untuk menambahkan project baru.'}
            </p>
            {isLeader && (
              <div className="mt-5 flex justify-center">
                <CreateProjectDialog
                  isLeader={isLeader}
                  defaultMilestoneId={milestone?.id || milestone_id}
                  milestones={allMilestones}
                  teams={teams}
                  eligiblePICs={eligiblePICs}
                  userTeamId={profile.team_id || undefined}
                />
              </div>
            )}
          </div>
        ) : (
          <ProjectList
            projects={projects}
            metadata={metadata}
            basePath="/projects"
            searchParams={{ milestone_id }}
          />
        )}
      </div>
    );
  }

  // Case 2: No specific milestone_id parameter provided in URL
  const { data: allProjects, metadata } = await getProjects({
    page: currentPage,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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
            <BreadcrumbPage>Semua Project</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <FolderKanban className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Daftar Seluruh Project
            </h1>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {metadata.total} Project
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar seluruh project aktif. Pilih milestone di bawah untuk melihat
            daftar per spesifik milestone.
          </p>
        </div>

        <CreateProjectDialog
          isLeader={isLeader}
          milestones={allMilestones}
          teams={teams}
          eligiblePICs={eligiblePICs}
          userTeamId={profile.team_id || undefined}
        />
      </div>

      {/* Milestone Quick Selector */}
      {allMilestones.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground px-1">
            Filter Milestone:
          </span>
          <Link
            href="/projects"
            className="rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-xs font-medium shadow-xs"
          >
            Semua ({metadata.total})
          </Link>
          {allMilestones.map((m: { id: string; title: string }) => (
            <Link
              key={m.id}
              href={`/projects?milestone_id=${m.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Target className="h-3 w-3 text-primary" />
              <span>{m.title}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Projects List */}
      {allProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/40 p-12 text-center shadow-xs">
          <Layers className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-lg font-semibold">Belum Ada Project</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Belum ada project yang dibuat di bawah milestone manapun.{' '}
            {isLeader
              ? 'Gunakan tombol di atas untuk membuat project baru.'
              : 'Hubungi leader tim untuk menambahkan project baru.'}
          </p>
        </div>
      ) : (
        <ProjectList
          projects={allProjects}
          metadata={metadata}
          basePath="/projects"
        />
      )}
    </div>
  );
}
