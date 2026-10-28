'use client';

import * as React from 'react';
import { CircleDot, CheckCircle2, GitBranch } from 'lucide-react';
import type { TaskDetail } from '../types/task.types';

interface TaskPrStatusBadgeProps {
  task: TaskDetail;
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'baru saja';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
  const diffInHours = Math.floor(diffInSeconds / 3600);
  if (diffInHours < 24) return `${diffInHours} jam lalu`;
  const diffInDays = Math.floor(diffInSeconds / (60 * 60 * 24));
  if (diffInDays < 7) return `${diffInDays} hari lalu`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} minggu lalu`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} bulan lalu`;
  return `${Math.floor(diffInDays / 365)} tahun lalu`;
}

export function TaskPrStatusBadge({ task }: TaskPrStatusBadgeProps) {
  const isDoneColumn =
    task.column?.name?.toLowerCase().includes('done') ||
    task.column?.name?.toLowerCase().includes('selesai') ||
    task.column?.name?.toLowerCase().includes('complete');

  const isClosed = task.test_status === 'passed' || isDoneColumn;
  const isChangesRequested = task.test_status === 'failed';
  const isOpenPR =
    !isClosed && !isChangesRequested && task.test_status === 'testing';

  const devName =
    task.developer?.full_name ||
    task.assignee?.full_name ||
    task.creator?.full_name ||
    'Developer';

  const testerName = task.tester?.full_name || 'QA Tester';
  const timeAgo = formatRelativeTime(task.updated_at || task.created_at);
  const branchName = task.github_branch || 'feature-branch';

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-1">
      {/* 1. Main Status Pill: Ungu Closed & Hijau Open */}
      {isClosed ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Closed</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs">
          <CircleDot className="h-3.5 w-3.5" />
          <span>Open</span>
        </span>
      )}

      {/* 2. Subline Meta Information */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {isClosed ? (
          <>
            <strong className="font-semibold text-foreground">
              {testerName}
            </strong>{' '}
            <span>telah memverifikasi &amp; menyelesaikan task ini ke</span>{' '}
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground font-semibold">
              Done
            </span>{' '}
            <span>{timeAgo}</span>
          </>
        ) : isOpenPR ? (
          <>
            <strong className="font-semibold text-foreground">{devName}</strong>{' '}
            <span>mengajukan pengujian untuk direview oleh</span>{' '}
            <strong className="font-semibold text-foreground">
              {testerName}
            </strong>{' '}
            <span>• {timeAgo}</span>
          </>
        ) : isChangesRequested ? (
          <>
            <strong className="font-semibold text-rose-600 dark:text-rose-400">
              {testerName}
            </strong>{' '}
            <span>meminta perbaikan dari</span>{' '}
            <strong className="font-semibold text-foreground">{devName}</strong>{' '}
            <span>• {timeAgo}</span>
          </>
        ) : (
          <>
            <strong className="font-semibold text-foreground">{devName}</strong>{' '}
            {task.dev_status === 'dev_done' ? (
              <span>
                telah menyelesaikan pengerjaan coding (siap membuka PR)
              </span>
            ) : (
              <span>sedang aktif mengerjakan task ini • {timeAgo}</span>
            )}
          </>
        )}

        {/* Branch indicator */}
        {task.github_branch && (
          <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-foreground">
            <GitBranch className="h-3 w-3 text-primary" />
            <span className="truncate max-w-[160px] sm:max-w-xs">
              {branchName}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
