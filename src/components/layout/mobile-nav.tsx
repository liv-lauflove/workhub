'use client';

import * as React from 'react';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './sidebar';
import { Button } from '@/components/ui/button';

interface MobileNavProps {
  user?: { email?: string } | null;
  profile?: {
    full_name?: string;
    role?: string;
    avatar_url?: string | null;
  } | null;
}

export function MobileNav({ user, profile }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Mobile Hamburger Trigger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label="Buka menu navigasi"
        className="h-9 w-9"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Backdrop & Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sidebar */}
          <div className="relative z-50 flex h-full w-72 max-w-[80vw] flex-col bg-card shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Close Button Header */}
            <div className="absolute right-3 top-3 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full"
                aria-label="Tutup menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Render Sidebar inside Drawer */}
            <div className="flex-1 overflow-hidden">
              <Sidebar
                user={user}
                profile={profile}
                onClose={() => setIsOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
