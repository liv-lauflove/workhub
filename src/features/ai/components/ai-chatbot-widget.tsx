'use client';

import * as React from 'react';
import { Sparkles, X } from 'lucide-react';
import { cn } from 'cn';
import { AiChatPanel } from './ai-chat-panel';

interface AiChatbotWidgetProps {
  user?: { email?: string; id?: string } | null;
  profile?: {
    full_name?: string;
    role?: string;
    avatar_url?: string | null;
    team_id?: string | null;
  } | null;
  teamName?: string;
  className?: string;
}

/**
 * Floating Chatbot Widget positioned at the bottom-right of the dashboard (Issue #44).
 * Provides a floating toggle button (FAB) with opening/closing transitions
 * and keyboard shortcut handling (Esc to close).
 */
export function AiChatbotWidget({
  user,
  profile,
  teamName,
  className,
}: AiChatbotWidgetProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Close when pressing the Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const displayName =
    profile?.full_name || user?.email?.split('@')[0] || 'Pengguna';
  const role = profile?.role || 'member';

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex flex-col items-end',
        className
      )}
    >
      {/* Floating Chat Panel with Smooth Scale & Fade Transition */}
      {isOpen && (
        <div className="mb-3 animate-in fade-in-0 zoom-in-95 duration-200 ease-out origin-bottom-right">
          <AiChatPanel
            onClose={() => setIsOpen(false)}
            userName={displayName}
            userRole={role}
            teamName={teamName}
            userAvatarUrl={profile?.avatar_url}
          />
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'group relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 ease-in-out cursor-pointer',
          'focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2',
          isOpen
            ? 'bg-muted text-foreground hover:bg-muted/80 rotate-90 scale-95'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-primary/25'
        )}
        aria-label={isOpen ? 'Tutup AI Assistant' : 'Buka AI Assistant'}
        title={
          isOpen ? 'Tutup AI Assistant (Esc)' : 'Buka Workhub AI Assistant'
        }
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform" />
        ) : (
          <>
            <Sparkles className="h-6 w-6 transition-transform group-hover:scale-110" />
            {/* Online Activity Pulse Dot */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background" />
            </span>
          </>
        )}
      </button>
    </div>
  );
}
