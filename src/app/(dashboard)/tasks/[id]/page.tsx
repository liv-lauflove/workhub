import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import {
  getTaskDetailById,
  getProjectColumns,
  getTaskActivityLogs,
} from '@/features/tasks/queries/task.queries';
import { getTeamMembers } from '@/features/team/queries/team.queries';
import { TaskDetailView } from '@/features/tasks/components/task-detail-view';
import { ROUTES } from '@/config/routes';

interface TaskDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: TaskDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const task = await getTaskDetailById(id);

  if (!task) {
    return {
      title: 'Task Tidak Ditemukan — Workhub',
    };
  }

  const shortId = id.slice(0, 8);
  return {
    title: `${task.title} #${shortId} — Workhub`,
    description:
      task.description || 'Detail informasi dan pelacakan task pada Workhub.',
  };
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const profile = await getUserProfile();

  if (!profile) {
    redirect(ROUTES.login);
  }

  const { id } = await params;
  const task = await getTaskDetailById(id);

  if (!task) {
    notFound();
  }

  const [availableColumns, activities] = await Promise.all([
    task.project_id ? getProjectColumns(task.project_id) : Promise.resolve([]),
    getTaskActivityLogs(id),
  ]);

  const teamId = task.project?.team_id || profile.team_id;
  const rawMembers = teamId ? await getTeamMembers(teamId) : [];
  const teamMembers = (rawMembers || []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    role: m.role,
    avatar_url: m.avatar_url,
  }));

  return (
    <TaskDetailView
      task={task}
      availableColumns={availableColumns}
      teamMembers={teamMembers}
      activities={activities}
    />
  );
}
