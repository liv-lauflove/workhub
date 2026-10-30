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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { signOut } from '@/features/auth/actions/auth.actions';
import { cn } from 'cn';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
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
  { label: 'Member', href: '/team', icon: 'Users' as const },
  { label: 'Workload', href: '/workload', icon: 'BarChart3' as const },
  { label: 'Archive (Segera)', href: '/archive', icon: 'Archive' as const },
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
  const { isCollapsed: contextCollapsed, toggleSidebar } = useSidebar();
  const isCollapsed = onClose ? false : contextCollapsed;

  const displayName =
    profile?.full_name || user?.email?.split('@')[0] || 'Pengguna';
  const roleLabel = profile?.role === 'leader' ? 'Team Lead' : 'Member';

  // Keyboard shortcut listener (Ctrl+B) for toggling sidebar on desktop
  React.useEffect(() => {
    if (onClose) return; // Do not register inside mobile drawer

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;

      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, toggleSidebar]);

  return (
    <TooltipPrimitive.Provider delay={100} closeDelay={50} timeout={300}>
      <aside
        className={cn(
          'flex h-full flex-col border-r bg-card text-card-foreground transition-[width] duration-300 ease-in-out overflow-x-hidden',
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
            'flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden p-3',
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
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              </SidebarTooltip>
            );
          })}
        </nav>

        {/* User Footer & Logout */}
        <div
          className={cn(
            'border-t p-3 transition-all duration-300 overflow-x-hidden',
            isCollapsed && 'p-2'
          )}
        >
          {/* Profile Card */}
          <div
            className={cn(
              'mb-2 flex items-center transition-all duration-300',
              isCollapsed ? 'justify-center' : 'gap-3 px-2 py-1.5'
            )}
          >
            <SidebarTooltip
              content={`${displayName} (${roleLabel})`}
              disabled={!isCollapsed}
            >
              <div className="flex shrink-0 items-center justify-center">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-8 w-8 rounded-full border object-cover shadow-2xs"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-2xs">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            </SidebarTooltip>

            {!isCollapsed && (
              <div className="flex flex-1 flex-col overflow-hidden text-left">
                <span className="truncate text-xs font-semibold text-foreground">
                  {displayName}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {roleLabel} {user?.email ? `• ${user.email}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Logout Form */}
          <form action={signOut} className="w-full">
            <SidebarTooltip content="Keluar" disabled={!isCollapsed}>
              <button
                type="submit"
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive cursor-pointer',
                  isCollapsed
                    ? 'h-9 w-9 justify-center mx-auto'
                    : 'w-full gap-2 px-3 py-2'
                )}
                aria-label={isCollapsed ? 'Keluar' : undefined}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Keluar</span>}
              </button>
            </SidebarTooltip>
          </form>

          {/* Collapse Sidebar Toggle Action (Desktop Only) */}
          {!onClose && (
            <div className="mt-2 pt-2 border-t border-border/60">
              <SidebarTooltip
                content={isCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
                shortcut="Ctrl+B"
                disabled={!isCollapsed}
              >
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className={cn(
                    'flex items-center rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer',
                    isCollapsed
                      ? 'h-9 w-9 justify-center mx-auto'
                      : 'w-full justify-between px-3 py-2'
                  )}
                  aria-label={
                    isCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'
                  }
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <PanelLeftOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <>
                        <PanelLeftClose className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>Ciutkan sidebar</span>
                      </>
                    )}
                  </div>
                  {!isCollapsed && (
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      Ctrl+B
                    </kbd>
                  )}
                </button>
              </SidebarTooltip>
            </div>
          )}
        </div>
      </aside>
    </TooltipPrimitive.Provider>
  );
}
