'use client';

import * as React from 'react';
import { cn } from 'cn';

interface SidebarTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Floating tooltip component for collapsed sidebar items.
 * Renders on hover to the right side of the item when disabled is false.
 */
export function SidebarTooltip({
  content,
  children,
  shortcut,
  disabled = false,
  className,
}: SidebarTooltipProps) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div className={cn('group/tooltip relative flex items-center', className)}>
      {children}
      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2',
          'flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md',
          'invisible opacity-0 transition-all duration-150 ease-out',
          'group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-0 -translate-x-1',
          // Arrow indicator pointing left
          'after:absolute after:right-full after:top-1/2 after:-translate-y-1/2 after:border-4 after:border-transparent after:border-r-popover'
        )}
      >
        <span>{content}</span>
        {shortcut && (
          <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {shortcut}
          </kbd>
        )}
      </div>
    </div>
  );
}
