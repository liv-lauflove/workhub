import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { redirect } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/routes';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { getDashboardPerformance } from '@/features/dashboard/queries/dashboard.queries';
import { getTeams } from '@/features/team/queries/team.queries';
import { DashboardView } from '@/features/dashboard/components/dashboard-view';

import type { QuarterFilter } from '@/features/dashboard/types/dashboard.types';

export const metadata: Metadata = {
  title: 'Dashboard Performa — Workhub',
  description:
    'Pemantauan performa kuartalan, progres tugas, dan kapasitas kerja tim.',
};

interface DashboardPageProps {
  searchParams: Promise<{
    q?: string;
    year?: string;
    teamId?: string;
    team?: string;
  }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  // Parallel: fetch profile + teams + searchParams concurrently
  const [profile, teams, resolvedParams] = await Promise.all([
    getUserProfile(),
    getTeams(),
    searchParams,
  ]);

  if (!profile) {
    redirect(ROUTES.login);
  }

  // 1. Parse quarter/year filters
  const parsedQ = resolvedParams.q ? parseInt(resolvedParams.q, 10) : undefined;
  const quarter =
    parsedQ && [1, 2, 3, 4].includes(parsedQ)
      ? (parsedQ as 1 | 2 | 3 | 4)
      : undefined;

  const parsedYear = resolvedParams.year
    ? parseInt(resolvedParams.year, 10)
    : undefined;
  const year =
    parsedYear && !isNaN(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : undefined;

  const filters: QuarterFilter | undefined =
    quarter || year ? { quarter, year } : undefined;

  // 2. Resolve Management status inline (no extra query)
  const userTeam = teams.find((t) => t.id === profile.team_id);
  const isManagement = userTeam?.name === 'Management';
  const teamParam = resolvedParams.team || resolvedParams.teamId;
  const currentTab =
    teamParam || (isManagement ? 'all' : profile.team_id) || 'all';

  let targetTeamId = profile.team_id || undefined;
  let teamName = userTeam?.name || 'My Team';

  if (isManagement) {
    if (currentTab === 'all') {
      targetTeamId = 'all';
      teamName = 'Semua Tim (BSA Tech)';
    } else {
      const targetTeam = teams.find(
        (t) =>
          t.id === currentTab ||
          t.name.toLowerCase() === currentTab.toLowerCase()
      );
      targetTeamId = targetTeam ? targetTeam.id : 'all';
      teamName = targetTeam ? targetTeam.name : 'Semua Tim (BSA Tech)';
    }
  }

  // 3. Fetch dashboard with pre-resolved context (skips 4 redundant queries)
  const dashboardData = targetTeamId
    ? await getDashboardPerformance(targetTeamId, filters, {
        userRole: profile.role,
        teamName,
      })
    : null;

  const querySuffix = `${quarter ? `&q=${quarter}` : ''}${year ? `&year=${year}` : ''}`;

  return (
    <div className="space-y-6">
      {/* Executive Squad Switcher Tabs for Management */}
      {isManagement && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>Executive Squad Switcher</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b pb-3">
            <Link
              href={`/?team=all${querySuffix}`}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors',
                currentTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              Semua Tim
            </Link>
            {teams.map((t) => {
              const isSelected =
                currentTab === t.id ||
                currentTab.toLowerCase() === t.name.toLowerCase();
              return (
                <Link
                  key={t.id}
                  href={`/?team=${t.name.toLowerCase()}${querySuffix}`}
                  className={cn(
                    'rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  Tim {t.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <DashboardView initialData={dashboardData} />
    </div>
  );
}
