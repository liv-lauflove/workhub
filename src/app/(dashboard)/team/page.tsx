import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import {
  getTeamMembers,
  getTeamInvitations,
  getTeams,
  getAllTeamMembers,
  getAllTeamInvitations,
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
import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export const metadata: Metadata = {
  title: 'Tim — Workhub',
  description: 'Kelola anggota tim dan undangan.',
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

  // If user has no team yet, show empty state
  if (!teamId) {
    const teams = await getTeams();
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Tim</h1>
        </div>
        <div className="rounded-lg border bg-card p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Belum Bergabung ke Tim</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kamu belum tergabung ke tim manapun. Hubungi leader untuk
            mendapatkan undangan bergabung ke salah satu tim berikut:
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {teams.map((team) => (
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

  const teams = await getTeams();
  const isManagement = await isManagementTeam(teamId);
  const resolvedParams = searchParams ? await searchParams : {};
  const currentTab =
    resolvedParams?.team || (isManagement ? 'all' : teamId) || 'all';

  let members: TeamMember[] = [];
  let invitations: Invitation[] = [];
  let displayTitle = '';
  let activeTargetTeamId = teamId;

  if (isManagement) {
    if (currentTab === 'all') {
      [members, invitations] = await Promise.all([
        getAllTeamMembers(),
        isLeader ? getAllTeamInvitations() : Promise.resolve([]),
      ]);
      displayTitle = 'Semua Tim (BSA Tech)';
      const defaultSquad =
        teams.find((t) => t.name !== 'Management') || teams[0];
      activeTargetTeamId = defaultSquad?.id ?? teamId;
    } else {
      const targetTeam = teams.find(
        (t) =>
          t.id === currentTab ||
          t.name.toLowerCase() === currentTab.toLowerCase()
      );
      activeTargetTeamId = targetTeam ? targetTeam.id : teamId;
      const targetTeamName = targetTeam ? targetTeam.name : 'Tim';

      [members, invitations] = await Promise.all([
        getTeamMembers(activeTargetTeamId),
        isLeader ? getTeamInvitations(activeTargetTeamId) : Promise.resolve([]),
      ]);
      displayTitle = `Tim ${targetTeamName}`;
    }
  } else {
    const userTeam = teams.find((t) => t.id === teamId);
    const teamName = userTeam?.name ?? 'Tim';
    [members, invitations] = await Promise.all([
      getTeamMembers(teamId),
      isLeader ? getTeamInvitations(teamId) : Promise.resolve([]),
    ]);
    displayTitle = `Tim ${teamName}`;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Executive Team Switcher Tabs for Management */}
      {isManagement && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>Executive Team Switcher</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b pb-3">
            <Link
              href="/team?team=all"
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
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {displayTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {members.length} anggota
            </p>
          </div>
        </div>

        {isLeader && (
          <InviteModal
            teamId={activeTargetTeamId}
            teams={teams}
            isManagement={isManagement}
          />
        )}
      </div>

      {/* Team Members Section */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Anggota</h2>
        <TeamMemberList
          members={members}
          isLeader={isLeader}
          teamId={activeTargetTeamId}
        />
      </section>

      {/* Invitations Section (Leader Only) */}
      {isLeader && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Undangan</h2>
          <InvitationList
            invitations={invitations}
            teamId={activeTargetTeamId}
            isLeader={isLeader}
          />
        </section>
      )}
    </div>
  );
}
