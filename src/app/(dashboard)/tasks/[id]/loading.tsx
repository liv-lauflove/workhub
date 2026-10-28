import { Skeleton } from '@/components/ui/skeleton';

export default function TaskDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* 1. Header Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>

        <div className="space-y-2 border-b pb-4">
          <Skeleton className="h-8 w-3/4 max-w-md" />
          <div className="flex items-center gap-3 pt-1">
            <Skeleton className="h-6 w-24 rounded-lg" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>

      {/* 2. 2-Column Grid Skeleton */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column (Main Thread) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Issue Card Skeleton */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <div className="p-6 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>

          {/* Timeline Skeleton */}
          <div className="space-y-4 pt-2">
            <Skeleton className="h-4 w-32" />
            <div className="relative pl-6 space-y-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-52" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="lg:col-span-4">
          <div className="space-y-6 rounded-xl border bg-card p-5">
            {/* Assignee */}
            <div className="border-b pb-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            {/* Labels */}
            <div className="border-b pb-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>

            {/* Projects */}
            <div className="border-b pb-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-6 w-28 rounded-lg" />
            </div>

            {/* Milestone */}
            <div className="border-b pb-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-40" />
            </div>

            {/* Due date */}
            <div className="border-b pb-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>

            {/* Development */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
