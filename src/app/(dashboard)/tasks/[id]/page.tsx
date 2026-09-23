import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import {
  getTaskDetailById,
  getProjectColumns,
} from '@/features/tasks/queries/task.queries';
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

  const availableColumns = task.project_id
    ? await getProjectColumns(task.project_id)
    : [];

  return <TaskDetailView task={task} availableColumns={availableColumns} />;
}
