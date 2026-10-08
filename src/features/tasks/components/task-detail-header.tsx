'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  ArrowLeft,
  CircleDot,
  GitPullRequest,
  Check,
  Loader2,
  Pencil,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { TaskPrStatusBadge } from './task-pr-status-badge';
import { TaskOpenPrDialog } from './task-open-pr-dialog';
import { updateTaskDevStatusAction } from '../actions/task.actions';
import type { TeamMemberOption } from './task-assignee-selector';
import type { TaskDetail } from '../types/task.types';

interface TaskDetailHeaderProps {
  task: TaskDetail;
  availableColumns?: { id: string; name: string; position: number }[];
  teamMembers?: TeamMemberOption[];
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'baru saja';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} hari lalu`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} minggu lalu`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} bulan lalu`;
  return `${Math.floor(diffInDays / 365)} tahun lalu`;
}

export function TaskDetailHeader({
  task,
  teamMembers = [],
}: TaskDetailHeaderProps) {
  const router = useRouter();
  const [isPrDialogOpen, setIsPrDialogOpen] = React.useState(false);
  const [isPendingDev, startTransitionDev] = React.useTransition();

  const shortId = task.id ? task.id.slice(0, 8) : '';
  const creatorName = task.creator?.full_name || 'Anggota Tim';
  const createdTimeAgo = formatRelativeTime(task.created_at);

  const isDoneColumn =
    task.column?.name?.toLowerCase().includes('done') ||
    task.column?.name?.toLowerCase().includes('selesai') ||
    task.column?.name?.toLowerCase().includes('complete');

  const isMerged = task.test_status === 'passed' || isDoneColumn;
  const isPrOpen =
    task.test_status === 'testing' || task.test_status === 'passed';
  const isDevDone = task.dev_status === 'dev_done';

  const handleToggleDevDone = () => {
    startTransitionDev(async () => {
      const nextStatus = isDevDone ? 'in_progress' : 'dev_done';
      const res = await updateTaskDevStatusAction({
        taskId: task.id,
        devStatus: nextStatus,
        projectId: task.project_id,
      });

      if (!res.success) {
        toast.error(
          res.error?._form?.[0] || 'Gagal memperbarui status development'
        );
        return;
      }

      if (nextStatus === 'dev_done') {
        toast.success(
          'Pengerjaan coding selesai! Tombol Open PR sekarang aktif.'
        );
      } else {
        toast.success('Status dikembalikan ke In Progress.');
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 pt-1">
      <TaskOpenPrDialog
        task={task}
        teamMembers={teamMembers}
        open={isPrDialogOpen}
        onOpenChange={setIsPrDialogOpen}
      />

      {/* 1. Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />

            {task.project ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    render={<Link href={`/projects/${task.project.id}`} />}
                  >
                    {task.project.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            ) : (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href="/tasks" />}>
                    My Tasks
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}

            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                #{shortId}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Back and Action Buttons */}
        <div className="flex items-center gap-2">
          {!isMerged && !isPrOpen && (
            <>
              {/* Tombol 1: Tandai Selesai Development */}
              <button
                type="button"
                onClick={handleToggleDevDone}
                disabled={isPendingDev}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs ${
                  isDevDone
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                    : 'bg-background text-foreground hover:bg-muted border-border/80'
                }`}
                title={
                  isDevDone
                    ? 'Development selesai. Klik untuk mengembalikan ke In Progress jika perlu revisi.'
                    : 'Tandai bahwa pengerjaan coding telah selesai.'
                }
              >
                {isPendingDev ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <Check
                    className={`h-3.5 w-3.5 ${
                      isDevDone
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                )}
                <span>{isDevDone ? '✓ Dev Done' : 'Selesai Dev'}</span>
              </button>

              {/* Tombol 2: Open PR (Sampingnya) */}
              {isDevDone ? (
                <button
                  type="button"
                  onClick={() => setIsPrDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                  title="Ajukan pengujian QA dengan membuka Pull Request"
                >
                  <GitPullRequest className="h-3.5 w-3.5" />
                  <span>Open PR</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground opacity-60 cursor-not-allowed shadow-2xs"
                  title="Selesaikan development (klik Selesai Dev) terlebih dahulu agar tombol Open PR aktif"
                >
                  <GitPullRequest className="h-3.5 w-3.5 opacity-60" />
                  <span>Open PR</span>
                </button>
              )}
            </>
          )}

          {!isMerged && isPrOpen && (
            <button
              type="button"
              onClick={() => setIsPrDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer"
              title="Edit judul, branch, reviewer, atau deskripsi Pull Request"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" />
              <span>Edit PR</span>
            </button>
          )}

          {task.project ? (
            <Link
              href={`/projects/${task.project.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
            >
              <FolderKanban className="h-3.5 w-3.5 text-primary" />
              <span>Buka Kanban</span>
            </Link>
          ) : (
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke My Tasks</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Main Title & Status Bar */}
      <div className="space-y-3 border-b pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-foreground flex items-baseline flex-wrap gap-2">
            <span>{task.title}</span>
            <span className="text-base sm:text-lg font-normal text-muted-foreground/60">
              #{shortId}
            </span>
          </h1>
        </div>

        {/* 3. GitHub Pull Request Status Banner & Metadata */}
        <TaskPrStatusBadge task={task} />

        {/* 4. Author Creation & Update Meta */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CircleDot className="h-3.5 w-3.5 text-primary" />
            <span>
              <strong className="font-semibold text-foreground">
                {creatorName}
              </strong>{' '}
              membuat task ini {createdTimeAgo}
            </span>
          </div>

          {task.updated_at && task.updated_at !== task.created_at && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span>diperbarui {formatRelativeTime(task.updated_at)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
