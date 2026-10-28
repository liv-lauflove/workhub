import { Skeleton } from '@/components/ui/skeleton';

export default function MyTasksLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-3" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </div>

      {/* Status Filter Tabs & Search Bar Skeleton */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-18 rounded-lg" />
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-full sm:w-72 rounded-lg" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-7 w-12 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-7 w-14 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        </div>
      </div>

      {/* Task Rows / Cards Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-4 space-y-3 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-1">
                <Skeleton className="h-3 w-3 rounded-full shrink-0" />
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-7 w-28 rounded-lg shrink-0" />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs border-t pt-2.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
