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
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { getProjectById } from '@/features/projects/queries/project.queries';
import { getProjectBoardColumns } from '@/features/kanban/queries/kanban.queries';
import { getTeamMembers } from '@/features/team/queries/team.queries';
import { ProjectTasksView } from '@/features/projects/components/project-tasks-view';
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
    title: `${project.name} — Task & Isu Project — Workhub`,
    description:
      project.description || `Pelacakan task dan isu project ${project.name}.`,
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

  // User can only create task if they belong to project's team or belong to Management team
  let isManagement = false;
  if (profile.team_id) {
    const supabase = await createClient();
    const { data: userTeam } = await supabase
      .from('teams')
      .select('name')
      .eq('id', profile.team_id)
      .single();
    if (userTeam?.name === 'Management') {
      isManagement = true;
    }
  }

  const canCreateTask =
    isManagement || !project.team_id || profile.team_id === project.team_id;

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

      {/* Project Header Card (Compact & Clean) */}
      <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-3">
        {/* Top: Title, Badges, & PIC */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-card-foreground">
                {project.name}
              </h1>
            </div>

            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusCfg.badgeClass}`}
            >
              {statusCfg.label}
            </span>

            {project.team && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Shield className="h-3 w-3" />
                <span>Tim {project.team.name}</span>
              </span>
            )}
          </div>

          {/* PIC */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <User className="h-3.5 w-3.5 text-primary" />
            <span>
              PIC:{' '}
              <strong className="text-foreground font-medium">
                {project.pic?.full_name || 'Tanpa PIC'}
              </strong>
            </span>
          </div>
        </div>

        {project.description && (
          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
            {project.description}
          </p>
        )}

        {/* Compact Progress Bar & Quick Stats */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6 pt-1 border-t border-border/50">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span>
                Progres ({project.completedTasks}/{project.totalTasks} Selesai)
              </span>
              <span className="font-bold text-foreground">
                {progressPercent}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${statusCfg.barClass}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span>{project.memberCount} Anggota</span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3 text-muted-foreground" />
              <span>{project.totalTasks} Task</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Tasks & Issues Container (GitHub Issues List & Kanban View Switcher) */}
      <ProjectTasksView
        projectId={project.id}
        columns={columns}
        teamMembers={teamMembers}
        currentUserId={profile.id}
        canCreateTask={canCreateTask}
      />
    </div>
  );
}
