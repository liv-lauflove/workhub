import { Skeleton } from '@/components/ui/skeleton';

export default function KanbanLoading() {
  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-3" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-3" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Kanban Board Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Kanban Board Columns Horizontal Scroll Container */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 pb-4 items-start min-w-[800px]">
          {Array.from({ length: 4 }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="w-72 sm:w-80 shrink-0 rounded-xl bg-muted/40 p-3 space-y-3 border shadow-2xs"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-6 rounded-full" />
                </div>
                <Skeleton className="h-6 w-6 rounded-md" />
              </div>

              {/* Task Cards in Column */}
              <div className="space-y-2.5">
                {Array.from({ length: colIndex === 0 ? 3 : 2 }).map(
                  (_, cardIndex) => (
                    <div
                      key={cardIndex}
                      className="rounded-lg border bg-card p-3.5 space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-12 rounded-sm" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <div className="flex items-center justify-between border-t pt-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Add Task Placeholder in Column */}
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
