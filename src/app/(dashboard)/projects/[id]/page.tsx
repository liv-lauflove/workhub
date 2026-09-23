import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  CheckSquare,
  FolderKanban,
  Shield,
  User,
  Users,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { getProjectById } from '@/features/projects/queries/project.queries';
import { getProjectBoardColumns } from '@/features/kanban/queries/kanban.queries';
import { getTeamMembers } from '@/features/team/queries/team.queries';
import { KanbanBoard } from '@/features/kanban/components/kanban-board';
import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog';
import { ROUTES } from '@/config/routes';

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
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

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    return { title: 'Project Tidak Ditemukan — Workhub' };
  }

  return {
    title: `${project.name} — Kanban Board — Workhub`,
    description:
      project.description ||
      `Papan Kanban pelacakan task project ${project.name}.`,
  };
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;

  const [profile, project] = await Promise.all([
    getUserProfile(),
    getProjectById(id),
  ]);

  if (!profile) {
    redirect(ROUTES.login);
  }

  if (!project) {
    notFound();
  }

  const [columns, teamMembers] = await Promise.all([
    getProjectBoardColumns(id),
    project.team_id ? getTeamMembers(project.team_id) : Promise.resolve([]),
  ]);
  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planned;
  const progressPercent = Math.min(Math.max(project.progress, 0), 100);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
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
          {project.milestone && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={<Link href={`/milestones/${project.milestone.id}`} />}
                >
                  {project.milestone.title}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbLink
              render={
                <Link
                  href={
                    project.milestone_id
                      ? `/projects?milestone_id=${project.milestone_id}`
                      : '/projects'
                  }
                />
              }
            >
              Project
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{project.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Back Navigation Link */}
      <div>
        <Link
          href={
            project.milestone_id
              ? `/projects?milestone_id=${project.milestone_id}`
              : '/projects'
          }
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>
            Kembali ke Daftar Project{' '}
            {project.milestone ? `(${project.milestone.title})` : ''}
          </span>
        </Link>
      </div>

      {/* Project Header Card */}
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.badgeClass}`}
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

            <div className="flex items-center gap-2.5">
              <FolderKanban className="h-6 w-6 text-primary shrink-0" />
              <h1 className="text-2xl font-bold tracking-tight text-card-foreground">
                {project.name}
              </h1>
            </div>

            {project.description && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Progress & Meta Info */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Progres Task ({project.completedTasks}/{project.totalTasks}{' '}
              Selesai)
            </span>
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

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{project.memberCount} Anggota Tim</span>
              </div>

              <div className="flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{project.totalTasks} Total Task</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              <span>
                PIC:{' '}
                <strong className="text-foreground font-medium">
                  {project.pic?.full_name || 'Tanpa PIC'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Papan Kanban
            </h2>
            <span className="text-xs text-muted-foreground">
              Geser kartu secara horizontal atau drag-and-drop untuk memperbarui
              status
            </span>
          </div>

          <CreateTaskDialog
            projectId={project.id}
            columns={columns.map((c) => ({ id: c.id, name: c.name }))}
            teamMembers={teamMembers.map((m) => ({
              id: m.id,
              full_name: m.full_name,
              role: m.role,
              avatar_url: m.avatar_url,
            }))}
          />
        </div>

        <KanbanBoard columns={columns} projectId={project.id} />
      </div>
    </div>
  );
}
