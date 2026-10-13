'use client';

import * as React from 'react';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
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
 * Uses Base UI Tooltip with Portal to mount floating content outside of the sidebar DOM hierarchy,
 * completely preventing horizontal scrollbars or overflow clipping.
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

  const trigger = React.isValidElement(children) ? (
    children
  ) : (
    <span className="inline-flex">{children}</span>
  );

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={trigger} delay={100} closeDelay={50} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner
          side="right"
          sideOffset={8}
          align="center"
          className="isolate z-50 outline-none"
        >
          <TooltipPrimitive.Popup
            className={cn(
              'z-50 flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
              className
            )}
          >
            <span>{content}</span>
            {shortcut && (
              <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {shortcut}
              </kbd>
            )}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
