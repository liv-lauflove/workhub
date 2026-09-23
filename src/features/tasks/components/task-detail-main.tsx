'use client';

import * as React from 'react';
import {
  Flame,
  MessageSquare,
  Milestone as MilestoneIcon,
  CircleDot,
  Send,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TaskDetail } from '../types/task.types';

interface TaskDetailMainProps {
  task: TaskDetail;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDetailDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function TaskDetailMain({ task }: TaskDetailMainProps) {
  const creatorName = task.creator?.full_name || 'Anggota Tim';
  const isCsComplaint = task.origin === 'cs_complaint';

  return (
    <div className="space-y-6">
      {/* 1. Main Issue Description Card (GitHub Issue Style) */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        {/* Card Header (Author & Meta Bar) */}
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5 min-w-0">
            {task.creator?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={task.creator.avatar_url}
                alt={creatorName}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-border shrink-0"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                {getInitials(creatorName)}
              </div>
            )}

            <div className="truncate">
              <span className="font-semibold text-foreground">
                {creatorName}
              </span>{' '}
              <span>
                membuat task ini pada {formatDetailDate(task.created_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-md border bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-2xs">
              Author
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* CS Complaint Callout Banner if applicable */}
          {isCsComplaint && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-rose-500/20 p-2 text-rose-600 dark:text-rose-400 shrink-0">
                  <Flame className="h-5 w-5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                    Tiket Keluhan Pelanggan (Customer Support)
                  </h4>
                  <p className="text-xs text-rose-600/90 dark:text-rose-300 leading-relaxed">
                    {task.origin_note ||
                      'Task ini dibuat sebagai eskalasi dari keluhan pengguna/pelanggan.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description Content */}
          {task.description ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-card-foreground leading-relaxed whitespace-pre-wrap font-sans text-sm sm:text-base selection:bg-primary/20">
              {task.description}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Tidak ada deskripsi rinci yang disediakan untuk task ini.
            </p>
          )}
        </div>
      </div>

      {/* 2. Activity & Discussion Timeline (GitHub Timeline Style) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
          <MessageSquare className="h-4 w-4" />
          <span>Aktivitas & Diskusi</span>
        </div>

        {/* Vertical Timeline Track */}
        <div className="relative pl-10 space-y-6 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
          {/* Event 1: Created */}
          <div className="relative flex items-center gap-3">
            <div className="absolute -left-10 flex h-7 w-7 items-center justify-center rounded-full bg-background border shadow-2xs text-primary ring-4 ring-background">
              <CircleDot className="h-3.5 w-3.5" />
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">
                {creatorName}
              </span>{' '}
              membuat task ini pada {formatDetailDate(task.created_at)}
            </div>
          </div>

          {/* Event 2: Milestone if assigned */}
          {task.project?.milestone && (
            <div className="relative flex items-center gap-3">
              <div className="absolute -left-10 flex h-7 w-7 items-center justify-center rounded-full bg-background border shadow-2xs text-muted-foreground ring-4 ring-background">
                <MilestoneIcon className="h-3.5 w-3.5" />
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Ditautkan ke milestone{' '}
                <span className="font-semibold text-foreground">
                  {task.project.milestone.title}
                </span>
              </div>
            </div>
          )}

          {/* Event 3: Column position */}
          {task.column && (
            <div className="relative flex items-center gap-3">
              <div className="absolute -left-10 flex h-7 w-7 items-center justify-center rounded-full bg-background border shadow-2xs text-emerald-600 dark:text-emerald-400 ring-4 ring-background">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Status saat ini berada di kolom{' '}
                <span className="font-semibold text-foreground">
                  {task.column.name}
                </span>
              </div>
            </div>
          )}

          {/* Event 4: Connected Comment Input Card */}
          <div className="relative pt-2">
            <div className="absolute -left-10 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-background border shadow-2xs ring-4 ring-background">
              {task.creator?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={task.creator.avatar_url}
                  alt={creatorName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-bold text-foreground">
                  {getInitials(creatorName)}
                </span>
              )}
            </div>

            <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
              <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-background px-2.5 py-1 font-semibold text-foreground shadow-2xs border">
                    Tulis Komentar
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Mendukung Markdown
                </span>
              </div>

              <div className="p-3 sm:p-4 space-y-3">
                <textarea
                  rows={3}
                  placeholder="Tulis tanggapan atau catatan progres task..."
                  className="w-full resize-none rounded-lg border bg-background/50 p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    💡 Komentar akan langsung terhubung ke timeline aktivitas di
                    Fase 2.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      toast.info(
                        'Fitur komentar dan diskusi tim akan aktif penuh pada Fase 2.'
                      );
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Kirim Komentar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
