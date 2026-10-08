import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* 1. Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-3" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-3" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-3" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* 2. Back Navigation Skeleton */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-3.5 w-3.5 rounded" />
        <Skeleton className="h-3.5 w-44" />
      </div>

      {/* 3. Project Header Card Skeleton */}
      <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-3">
        {/* Top: Title, Badges, & PIC */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-56" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        {/* Description */}
        <Skeleton className="h-3.5 w-3/4 max-w-2xl" />

        {/* Progress Bar & Quick Stats */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6 pt-1 border-t border-border/50">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        </div>
      </div>

      {/* 4. Top GitHub Navigation Bar (Task vs Pull request) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-1">
        <div className="flex items-center gap-4 -mb-[5px]">
          {/* Tab 1: Task */}
          <div className="flex items-center gap-2 pb-3 px-1 border-b-2 border-emerald-600">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          {/* Tab 2: Pull request */}
          <div className="flex items-center gap-2 pb-3 px-1 border-b-2 border-transparent">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
        </div>

        {/* Action Controls: List vs Board Switcher & New task button */}
        <div className="flex items-center gap-2.5 pb-2">
          <Skeleton className="h-7 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* 5. GitHub Issues Search Bar Skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>

      {/* 6. GitHub Issues Box Container Skeleton */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Table Subheader Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        {/* Task Rows */}
        <div className="divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Skeleton className="h-4 w-4 rounded-full mt-0.5 shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton
                      className="h-4 rounded"
                      style={{ width: `${i % 2 === 0 ? '60%' : '45%'}` }}
                    />
                    <Skeleton className="h-4 w-14 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 pt-0.5">
                <Skeleton className="h-5 w-12 rounded" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
