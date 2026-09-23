'use client';

import * as React from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateTaskColumnAction } from '@/features/kanban/actions/kanban.actions';

interface ColumnOption {
  id: string;
  name: string;
  position: number;
}

interface TaskStatusSelectorProps {
  taskId: string;
  currentColumnId?: string;
  currentColumnName?: string;
  projectId?: string | null;
  availableColumns: ColumnOption[];
}

function getColumnColorClass(name?: string): string {
  if (!name) return 'bg-muted text-muted-foreground';
  const lower = name.toLowerCase();
  if (
    lower.includes('todo') ||
    lower.includes('to do') ||
    lower.includes('backlog')
  ) {
    return 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25';
  }
  if (
    lower.includes('progress') ||
    lower.includes('doing') ||
    lower.includes('in work')
  ) {
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25';
  }
  if (
    lower.includes('review') ||
    lower.includes('qa') ||
    lower.includes('testing')
  ) {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25';
  }
  if (
    lower.includes('done') ||
    lower.includes('complete') ||
    lower.includes('selesai')
  ) {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
  }
  return 'bg-primary/10 text-primary border-primary/25';
}

function getColumnDotColor(name?: string): string {
  if (!name) return 'bg-muted-foreground';
  const lower = name.toLowerCase();
  if (
    lower.includes('todo') ||
    lower.includes('to do') ||
    lower.includes('backlog')
  ) {
    return 'bg-zinc-500';
  }
  if (
    lower.includes('progress') ||
    lower.includes('doing') ||
    lower.includes('in work')
  ) {
    return 'bg-blue-500';
  }
  if (
    lower.includes('review') ||
    lower.includes('qa') ||
    lower.includes('testing')
  ) {
    return 'bg-amber-500';
  }
  if (
    lower.includes('done') ||
    lower.includes('complete') ||
    lower.includes('selesai')
  ) {
    return 'bg-emerald-500';
  }
  return 'bg-primary';
}

export function TaskStatusSelector({
  taskId,
  currentColumnId,
  currentColumnName,
  projectId,
  availableColumns,
}: TaskStatusSelectorProps) {
  const [selectedColumnId, setSelectedColumnId] = React.useState(
    currentColumnId || ''
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeColumn = availableColumns.find(
    (c) => c.id === selectedColumnId
  ) || {
    id: selectedColumnId,
    name: currentColumnName || 'Status',
    position: 0,
  };

  const handleSelect = (column: ColumnOption) => {
    if (column.id === selectedColumnId || isPending) {
      setIsOpen(false);
      return;
    }

    const previousId = selectedColumnId;
    setSelectedColumnId(column.id);
    setIsOpen(false);

    startTransition(async () => {
      const res = await updateTaskColumnAction({
        taskId,
        targetColumnId: column.id,
        projectId: projectId || '',
      });

      if (res.success) {
        toast.success(`Status task dipindahkan ke "${column.name}"`);
      } else {
        setSelectedColumnId(previousId);
        const errMsg =
          res.error?._form?.[0] || 'Gagal memperbarui status task.';
        toast.error(errMsg);
      }
    });
  };

  if (!availableColumns || availableColumns.length === 0) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${getColumnColorClass(
          currentColumnName
        )}`}
      >
        <span
          className={`h-2 w-2 rounded-full ${getColumnDotColor(
            currentColumnName
          )}`}
        />
        <span>{currentColumnName || 'Unassigned'}</span>
      </span>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${getColumnColorClass(
          activeColumn.name
        )}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
          <span
            className={`h-2 w-2 rounded-full ${getColumnDotColor(
              activeColumn.name
            )}`}
          />
        )}
        <span>{activeColumn.name}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-50 w-48 origin-top-left rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/5 animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b mb-1">
            Ubah Status Kolom
          </div>
          <div className="space-y-0.5">
            {availableColumns.map((col) => {
              const isSelected = col.id === selectedColumnId;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleSelect(col)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors text-left ${
                    isSelected
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${getColumnDotColor(
                        col.name
                      )}`}
                    />
                    <span>{col.name}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
