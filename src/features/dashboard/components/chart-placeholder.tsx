'use client';

import * as React from 'react';
import { TrendingUp, BarChart2, Calendar, Sparkles } from 'lucide-react';

interface ChartPlaceholderProps {
  quarterLabel: string;
  completionRate?: number;
}

export function ChartPlaceholder({
  quarterLabel,
  completionRate = 0,
}: ChartPlaceholderProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs">
      {/* 1. Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold tracking-tight text-foreground">
              Tren Penyelesaian Task Kuartalan
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Laju kumulatif penyelesaian task per minggu vs proyeksi target{' '}
            {quarterLabel}.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 rounded-md border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{quarterLabel}</span>
          </span>

          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" />
            <span>Issue #31</span>
          </span>
        </div>
      </div>

      {/* 2. Visual Chart Frame / Graphic Placeholder */}
      <div className="relative mt-4 flex flex-col justify-between rounded-lg border border-dashed bg-muted/20 p-6 min-h-[260px] sm:min-h-[290px] overflow-hidden">
        {/* Mock Graphic Grid Lines */}
        <div className="absolute inset-0 p-6 flex flex-col justify-between opacity-30 pointer-events-none">
          <div className="w-full border-b border-muted-foreground/30" />
          <div className="w-full border-b border-muted-foreground/30" />
          <div className="w-full border-b border-muted-foreground/30" />
          <div className="w-full border-b border-muted-foreground/30" />
        </div>

        {/* Mock Chart Silhouette (Bars & Wave) */}
        <div className="absolute bottom-6 left-12 right-6 h-36 flex items-end justify-between gap-2 sm:gap-4 opacity-25 pointer-events-none">
          <div className="w-full bg-primary/40 rounded-t h-[30%]" />
          <div className="w-full bg-primary/50 rounded-t h-[45%]" />
          <div className="w-full bg-primary/60 rounded-t h-[60%]" />
          <div className="w-full bg-primary/70 rounded-t h-[50%]" />
          <div className="w-full bg-primary/80 rounded-t h-[75%]" />
          <div className="w-full bg-primary/90 rounded-t h-[65%]" />
          <div className="w-full bg-primary rounded-t h-[85%]" />
          <div className="w-full bg-primary/40 rounded-t h-[40%]" />
        </div>

        {/* Center Callout Box */}
        <div className="relative z-10 m-auto max-w-sm rounded-xl border bg-card/90 backdrop-blur-xs p-5 text-center shadow-xs">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BarChart2 className="h-5 w-5" />
          </div>
          <h4 className="mt-2.5 text-sm font-bold text-foreground">
            Grafik Penyelesaian Task
          </h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Wadah visualisasi ini disiapkan untuk integrasi grafik tren mingguan
            dan bulanan pada{' '}
            <strong className="text-foreground">Issue #31</strong>.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span>Rasio Selesai Saat Ini: {completionRate}%</span>
          </div>
        </div>

        {/* Mock X-Axis Labels */}
        <div className="relative z-10 mt-auto flex items-center justify-between text-[11px] text-muted-foreground pt-4 border-t border-muted-foreground/20">
          <span>Minggu 1</span>
          <span>Minggu 4</span>
          <span>Minggu 8</span>
          <span>Minggu 12</span>
        </div>
      </div>

      {/* 3. Card Footer */}
      <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Menampilkan agregat progres task seluruh project aktif dalam tim.
        </span>
        <span className="font-medium text-foreground">
          Pembaruan otomatis tiap minggu
        </span>
      </div>
    </div>
  );
}
