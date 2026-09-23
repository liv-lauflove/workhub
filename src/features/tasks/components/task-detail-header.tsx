'use client';

import * as React from 'react';
import Link from 'next/link';
import { Copy, Check, FolderKanban, ArrowLeft, CircleDot } from 'lucide-react';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { TaskStatusSelector } from './task-status-selector';
import type { TaskDetail } from '../types/task.types';

interface TaskDetailHeaderProps {
  task: TaskDetail;
  availableColumns: { id: string; name: string; position: number }[];
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
  availableColumns,
}: TaskDetailHeaderProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Tautan task berhasil disalin ke clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortId = task.id ? task.id.slice(0, 8) : '';
  const creatorName = task.creator?.full_name || 'Anggota Tim';
  const createdTimeAgo = formatRelativeTime(task.created_at);

  return (
    <div className="space-y-4 pt-1">
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

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
            title="Salin tautan task ini"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  Tersalin
                </span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Salin Tautan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Title & Status Bar */}
      <div className="space-y-2 border-b pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-baseline flex-wrap gap-2.5">
            <span>{task.title}</span>
            <span className="text-xl sm:text-2xl font-light text-muted-foreground/70">
              #{shortId}
            </span>
          </h1>
        </div>

        {/* 3. Status Badge Pill and Author Meta */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
          {/* Quick status selector */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/70 text-[11px] font-medium hidden sm:inline">
              Status:
            </span>
            <TaskStatusSelector
              taskId={task.id}
              currentColumnId={task.column_id}
              currentColumnName={task.column?.name}
              projectId={task.project_id}
              availableColumns={availableColumns}
            />
          </div>

          <span className="text-muted-foreground/40 hidden sm:inline">•</span>

          {/* Author info */}
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
