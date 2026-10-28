import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-12">
      {/* 1. Title & Header Actions Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* 2. Metric Cards Skeleton Grid (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-5 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-36" />
            <div className="pt-3 border-t">
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Middle Section: Chart Placeholder & Priority Breakdown Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Skeleton (col-span-2) */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-72" />
            </div>
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>

        {/* Priority Breakdown Skeleton (col-span-1) */}
        <div className="lg:col-span-1 rounded-xl border bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b pb-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Recent Tasks & Team Capacity Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks Skeleton (col-span-2) */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-56" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-1.5 flex-1 pr-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Team Capacity Skeleton (col-span-1) */}
        <div className="lg:col-span-1 rounded-xl border bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3.5 w-44" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                  <Skeleton className="h-3.5 w-10" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
