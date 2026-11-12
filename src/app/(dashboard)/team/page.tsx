import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, Shield, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import {
  getTeamMembers,
  getTeamInvitations,
  getTeamsWithMemberStats,
  isManagementTeam,
} from '@/features/team/queries/team.queries';
import {
  TeamMemberList,
  type TeamMember,
} from '@/features/team/components/team-member-list';
import {
  InvitationList,
  type Invitation,
} from '@/features/team/components/invitation-list';
import { InviteModal } from '@/features/team/components/invite-modal';
import { TeamCardGrid } from '@/features/team/components/team-card-grid';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export const metadata: Metadata = {
  title: 'Member & Tim | Workhub',
  description: 'Kelola anggota tim, squad, dan undangan.',
};

interface TeamPageProps {
  searchParams?: Promise<{ team?: string }>;
}

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const profile = await getUserProfile();

  if (!profile) {
    redirect(ROUTES.login);
  }

  const isLeader = profile.role === 'leader';
  const teamId = profile.team_id;
  const isManagement = await isManagementTeam(teamId);
  const teamsWithStats = await getTeamsWithMemberStats();

  // If user has no team yet, show empty state or guide
  if (!teamId && !isManagement) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Member & Tim</h1>
        </div>
        <div className="rounded-lg border bg-card p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Belum Bergabung ke Tim</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kamu belum tergabung ke tim manapun. Hubungi leader untuk
            mendapatkan undangan bergabung ke salah satu tim berikut:
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {teamsWithStats.map((team) => (
              <span
                key={team.id}
                className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
              >
                {team.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const currentTab = resolvedParams?.team || 'all';

  const isOverview = currentTab === 'all';

  // Find targeted team if drill-down is requested
  const targetTeam = teamsWithStats.find(
    (t) =>
      t.id === currentTab || t.name.toLowerCase() === currentTab.toLowerCase()
  );

  const activeTargetTeamId = targetTeam ? targetTeam.id : teamId || '';
  const canManageThisTeam =
    isManagement || (profile.team_id === activeTargetTeamId && isLeader);

  let members: TeamMember[] = [];
  let invitations: Invitation[] = [];

  if (!isOverview && targetTeam) {
    [members, invitations] = await Promise.all([
      getTeamMembers(activeTargetTeamId),
      canManageThisTeam
        ? getTeamInvitations(activeTargetTeamId)
        : Promise.resolve([]),
    ]);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Team Navigation Switcher (for Management and quick hopping) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isManagement ? (
            <>
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>Executive Team Switcher</span>
            </>
          ) : (
            <>
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>Navigasi Tim</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b pb-3">
          <Link
            href="/team?team=all"
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors',
              isOverview
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            Semua Tim
          </Link>
          {teamsWithStats.map((t) => {
            const isSelected =
              !isOverview &&
              (currentTab === t.id ||
                currentTab.toLowerCase() === t.name.toLowerCase());
            return (
              <Link
                key={t.id}
                href={`/team?team=${t.name.toLowerCase()}`}
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

      {/* View Conditional: Overview Grid vs Drill-Down Detail */}
      {isOverview || !targetTeam ? (
        <TeamCardGrid teams={teamsWithStats} isManagement={isManagement} />
      ) : (
        <div className="space-y-6">
          {/* Back button to Overview */}
          <div>
            <Link
              href="/team?team=all"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>← Kembali ke Semua Tim</span>
            </Link>
          </div>

          {/* Drill-down Team Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                {targetTeam.isManagement ? (
                  <Shield className="h-6 w-6" />
                ) : (
                  <Users className="h-6 w-6" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Tim {targetTeam.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {members.length} anggota aktif
                </p>
              </div>
            </div>

            {canManageThisTeam && (
              <InviteModal
                teamId={activeTargetTeamId}
                teams={teamsWithStats}
                isManagement={isManagement}
              />
            )}
          </div>

          {/* Team Members Section */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Anggota</h2>
            <TeamMemberList
              members={members}
              isLeader={canManageThisTeam}
              teamId={activeTargetTeamId}
            />
          </section>

          {/* Invitations Section (Leader/Management Only) */}
          {canManageThisTeam && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Undangan</h2>
              <InvitationList
                invitations={invitations}
                teamId={activeTargetTeamId}
                isLeader={canManageThisTeam}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
