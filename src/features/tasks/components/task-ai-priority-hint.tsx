'use client';

import * as React from 'react';
import {
  Sparkles,
  Check,
  Clock,
  X,
  Zap,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  TaskPriorityLevel,
  TaskPriorityPredictionResult,
} from '@/features/ai/types/ai.types';

interface TaskAiPriorityHintProps {
  isLoading?: boolean;
  prediction: TaskPriorityPredictionResult | null;
  currentPriority: TaskPriorityLevel;
  onApply: (priority: TaskPriorityLevel) => void;
  onDismiss?: () => void;
  className?: string;
}

const PRIORITY_BADGE_STYLES: Record<
  TaskPriorityLevel,
  { label: string; badgeClass: string }
> = {
  critical: {
    label: 'Critical',
    badgeClass:
      'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
  high: {
    label: 'High',
    badgeClass:
      'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  },
  medium: {
    label: 'Medium',
    badgeClass:
      'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
  low: {
    label: 'Low',
    badgeClass:
      'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  },
};

export function TaskAiPriorityHint({
  isLoading,
  prediction,
  currentPriority,
  onApply,
  onDismiss,
  className,
}: TaskAiPriorityHintProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-muted-foreground animate-pulse shadow-2xs',
          className
        )}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-primary animate-spin" />
        <div className="flex flex-1 items-center justify-between">
          <span>
            AI sedang menganalisis tingkat prioritas & durasi tugas...
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            Mengevaluasi...
          </span>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return null;
  }

  const badgeInfo =
    PRIORITY_BADGE_STYLES[prediction.suggestedPriority] ??
    PRIORITY_BADGE_STYLES.medium;
  const isApplied = currentPriority === prediction.suggestedPriority;

  return (
    <div
      className={cn(
        'relative rounded-xl border p-3.5 text-xs transition-all shadow-2xs',
        isApplied
          ? 'border-primary/20 bg-primary/5 text-foreground'
          : 'border-amber-500/30 bg-amber-500/5 text-foreground',
        className
      )}
    >
      {/* Header bar: AI badge + predicted tags + status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[11px] uppercase tracking-wide">Saran AI</span>
          {prediction.isCached && (
            <span
              className="inline-flex items-center gap-0.5 rounded px-1 py-0.2 text-[9px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              title="Rekomendasi instan dari cache query"
            >
              <Zap className="h-2.5 w-2.5" />
              <span>Instan</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Priority Badge */}
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-tight shadow-2xs',
              badgeInfo.badgeClass
            )}
          >
            {badgeInfo.label}
          </span>

          {/* Duration Badge */}
          {prediction.estimatedDuration && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground shadow-2xs">
              <Clock className="h-2.5 w-2.5 shrink-0" />
              <span>{prediction.estimatedDuration}</span>
            </span>
          )}

          {/* Override Indicator Tag */}
          {!isApplied && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
              title="Human Override: Anda memilih tingkat prioritas yang berbeda dari rekomendasi AI"
            >
              <ShieldCheck className="h-2.5 w-2.5" />
              <span>Override</span>
            </span>
          )}

          {/* Dismiss button */}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Tutup saran AI"
              aria-label="Tutup saran AI"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Rationale text with muted tint */}
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        {prediction.reason}
      </p>

      {/* Action footer */}
      <div
        className={cn(
          'mt-2.5 flex items-center justify-between pt-2 border-t',
          isApplied ? 'border-primary/10' : 'border-amber-500/20'
        )}
      >
        <span className="text-[10px] text-muted-foreground">
          {isApplied
            ? '✓ Prioritas yang disarankan AI telah aktif.'
            : `Pilihan Anda (${currentPriority.toUpperCase()}) menggantikan rekomendasi AI.`}
        </span>

        {isApplied ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            <span>Aktif</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onApply(prediction.suggestedPriority)}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/90 hover:bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-2xs transition-all cursor-pointer active:scale-95"
            title={`Gunakan prioritas rekomendasi AI: ${badgeInfo.label}`}
          >
            <RotateCcw className="h-3 w-3" />
            <span>Gunakan Rekomendasi AI ({badgeInfo.label})</span>
          </button>
        )}
      </div>
    </div>
  );
}
