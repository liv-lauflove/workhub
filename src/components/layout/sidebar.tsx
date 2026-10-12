'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListTodo,
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
import { useSidebar } from './sidebar-context';
import { SidebarTooltip } from './sidebar-tooltip';

const ICON_MAP = {
  LayoutDashboard,
  ListTodo,
  Target,
  Users,
  BarChart3,
  Archive,
  Settings,
} as const;

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' as const },
  { label: 'My Tasks', href: '/tasks', icon: 'ListTodo' as const },
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
  const { isCollapsed: contextCollapsed } = useSidebar();
  const isCollapsed = onClose ? false : contextCollapsed;

  const displayName =
    profile?.full_name || user?.email?.split('@')[0] || 'Pengguna';
  const roleLabel = profile?.role === 'leader' ? 'Team Lead' : 'Member';

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-card text-card-foreground transition-[width] duration-300 ease-in-out',
        onClose ? 'w-full' : isCollapsed ? 'w-16 md:w-16' : 'w-full md:w-64'
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          'flex h-14 items-center border-b transition-all duration-300',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-6'
        )}
      >
        <SidebarTooltip content="Workhub" disabled={!isCollapsed}>
          <Link
            href="/"
            className="flex items-center gap-2.5 overflow-hidden"
            onClick={onClose}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg shadow-2xs">
              W
            </div>
            {!isCollapsed && (
              <span className="text-lg font-bold tracking-tight truncate">
                Workhub
              </span>
            )}
          </Link>
        </SidebarTooltip>
      </div>

      {/* Navigation Links */}
      <nav
        className={cn(
          'flex-1 space-y-1.5 overflow-y-auto p-3',
          isCollapsed && 'px-2'
        )}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <SidebarTooltip
              key={item.href}
              content={item.label}
              disabled={!isCollapsed}
            >
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  isCollapsed
                    ? 'h-10 w-10 justify-center mx-auto'
                    : 'gap-3 px-3 py-2',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </SidebarTooltip>
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
