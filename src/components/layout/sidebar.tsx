'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Target,
  Users,
  BarChart3,
  Archive,
  Settings,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { signOut } from '@/features/auth/actions/auth.actions';
import { cn } from 'cn';

const ICON_MAP = {
  LayoutDashboard,
  Target,
  Users,
  BarChart3,
  Archive,
  Settings,
} as const;

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' as const },
  { label: 'Milestones', href: '/milestones', icon: 'Target' as const },
  { label: 'Team', href: '/team', icon: 'Users' as const },
  { label: 'Workload', href: '/workload', icon: 'BarChart3' as const },
  { label: 'Archive', href: '/archive', icon: 'Archive' as const },
  { label: 'Settings', href: '/settings', icon: 'Settings' as const },
];

interface SidebarProps {
  user?: { email?: string } | null;
  profile?: {
    full_name?: string;
    role?: string;
    avatar_url?: string | null;
  } | null;
  onClose?: () => void;
}

export function Sidebar({ user, profile, onClose }: SidebarProps) {
  const pathname = usePathname();

  const displayName =
    profile?.full_name || user?.email?.split('@')[0] || 'Pengguna';
  const roleLabel = profile?.role === 'leader' ? 'Team Lead' : 'Member';

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card text-card-foreground">
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="flex items-center gap-2" onClick={onClose}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            W
          </div>
          <span className="text-lg font-bold tracking-tight">Workhub</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="border-t p-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-9 w-9 rounded-full border object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserIcon className="h-4 w-4" />
            </div>
          )}
          <div className="flex flex-1 flex-col overflow-hidden text-left">
            <span className="truncate text-sm font-semibold">
              {displayName}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {roleLabel} {user?.email ? `• ${user.email}` : ''}
            </span>
          </div>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Keluar</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
