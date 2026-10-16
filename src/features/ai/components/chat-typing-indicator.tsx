'use client';

import * as React from 'react';
import { Bot } from 'lucide-react';
import { cn } from 'cn';

interface ChatTypingIndicatorProps {
  statusText?: string;
  className?: string;
}

/**
 * Animated typing / thinking indicator displayed while waiting for LLM response (Issue #44).
 */
export function ChatTypingIndicator({
  statusText = 'Sedang menganalisis data...',
  className,
}: ChatTypingIndicatorProps) {
  return (
    <div className={cn('flex w-full items-start gap-2.5 text-sm', className)}>
      {/* Bot Avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-2xs">
        <Bot className="h-3.5 w-3.5" />
      </div>

      {/* Bubble Container */}
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-border/80 bg-card px-3.5 py-2.5 text-xs text-muted-foreground shadow-2xs">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce" />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground/90">
          {statusText}
        </span>
      </div>
    </div>
  );
}
