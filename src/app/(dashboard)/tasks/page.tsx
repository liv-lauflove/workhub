import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ListTodo } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { getMyTasks } from '@/features/tasks/queries/task.queries';
import { MyTasksList } from '@/features/tasks/components/my-tasks-list';
import { ROUTES } from '@/config/routes';

export const metadata: Metadata = {
  title: 'Tugas Saya — Workhub',
  description: 'Daftar tugas yang ditugaskan kepada Anda untuk fokus eksekusi.',
};

export default async function MyTasksPage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect(ROUTES.login);
  }

  const tasks = await getMyTasks();

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
            <BreadcrumbPage>Tugas Saya</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <ListTodo className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Tugas Saya</h1>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {tasks.length} Tugas
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Personal cockpit untuk memantau tugas dan tanggung jawab Anda secara
            langsung tanpa terdistraksi task lain.
          </p>
        </div>
      </div>

      {/* Main Tasks Content */}
      <MyTasksList tasks={tasks} />
    </div>
  );
}
