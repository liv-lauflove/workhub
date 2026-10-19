import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { getTeamWorkload } from '@/features/workload/queries/workload.queries';
import {
  getTeams,
  isManagementTeam,
} from '@/features/team/queries/team.queries';
import { WorkloadView } from '@/features/workload/components/workload-view';

export const metadata: Metadata = {
  title: 'Workload & Kapasitas — Workhub',
  description:
    'Pantau beban kerja dan kapasitas tim berdasarkan bobot prioritas task aktif.',
};

interface WorkloadPageProps {
  searchParams?: Promise<{ team?: string }>;
}

export default async function WorkloadPage({
  searchParams,
}: WorkloadPageProps) {
  const profile = await getUserProfile();

  if (!profile) {
    redirect(ROUTES.login);
  }

  const teams = await getTeams();
  const isManagement = await isManagementTeam(profile.team_id);
  const resolvedParams = searchParams ? await searchParams : {};
  const currentTab =
    resolvedParams?.team || (isManagement ? 'all' : profile.team_id) || 'all';

  let targetTeamId = profile.team_id || undefined;

  if (isManagement) {
    if (currentTab === 'all') {
      targetTeamId = 'all';
    } else {
      const targetTeam = teams.find(
        (t) =>
          t.id === currentTab ||
          t.name.toLowerCase() === currentTab.toLowerCase()
      );
      targetTeamId = targetTeam ? targetTeam.id : profile.team_id || undefined;
    }
  }

  const workload = targetTeamId ? await getTeamWorkload(targetTeamId) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Executive Squad Switcher Tabs for Management */}
      {isManagement && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>Executive Squad Switcher</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b pb-3">
            <Link
              href="/workload?team=all"
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
                  href={`/workload?team=${t.name.toLowerCase()}`}
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

      <WorkloadView initialWorkload={workload} userRole={profile.role} />
    </div>
  );
}
