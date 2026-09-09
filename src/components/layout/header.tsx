import * as React from 'react';
import { MobileNav } from './mobile-nav';
import { LogOut, User as UserIcon } from 'lucide-react';
import { signOut } from '@/features/auth/actions/auth.actions';

interface HeaderProps {
  user?: { email?: string } | null;
  profile?: {
    full_name?: string;
    role?: string;
    avatar_url?: string | null;
  } | null;
}

export function Header({ user, profile }: HeaderProps) {
  const displayName =
    profile?.full_name || user?.email?.split('@')[0] || 'Pengguna';
  const isLeader = profile?.role === 'leader';

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur-md md:px-6">
      {/* Left: Mobile Nav Button & Breadcrumb */}
      <div className="flex items-center gap-3">
        <MobileNav user={user} profile={profile} />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
            Workhub
          </span>
          <span className="text-muted-foreground/40 hidden sm:inline">/</span>
          <h1 className="text-sm font-semibold tracking-tight">
            Task & Performance Dashboard
          </h1>
        </div>
      </div>

      {/* Right: User Status & Direct Logout */}
      <div className="flex items-center gap-3">
        {/* Role Badge */}
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isLeader
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-primary/15 text-primary'
          }`}
        >
          {isLeader ? 'Leader' : 'Member'}
        </span>

        {/* User Info (Desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-7 w-7 rounded-full border object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserIcon className="h-3.5 w-3.5" />
            </div>
          )}
          <span className="text-sm font-medium">{displayName}</span>
        </div>

        {/* Logout Action Button */}
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            title="Keluar dari akun"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </form>
      </div>
    </header>
  );
}
