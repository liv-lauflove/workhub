import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-3" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-3" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Milestone Quick Selector Filter Skeleton */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-xs">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-20 rounded-lg" />
        <Skeleton className="h-6 w-28 rounded-lg" />
        <Skeleton className="h-6 w-24 rounded-lg" />
        <Skeleton className="h-6 w-32 rounded-lg" />
      </div>

      {/* Project Cards Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-5 space-y-4 shadow-xs"
          >
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-16 rounded-full shrink-0" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>

            {/* Progress Bar Skeleton */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>

            {/* Footer Metadata */}
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-3.5 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Bar Skeleton */}
      <div className="flex items-center justify-between border-t pt-4">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
