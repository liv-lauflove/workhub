import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import {
  getTeamMembers,
  getTeamInvitations,
  getTeams,
} from '@/features/team/queries/team.queries';
import { TeamMemberList } from '@/features/team/components/team-member-list';
import { InvitationList } from '@/features/team/components/invitation-list';
import { InviteModal } from '@/features/team/components/invite-modal';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export const metadata: Metadata = {
  title: 'Tim — Workhub',
  description: 'Kelola anggota tim dan undangan.',
};

export default async function TeamPage() {
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

  const [members, invitations, teams] = await Promise.all([
    getTeamMembers(teamId),
    isLeader ? getTeamInvitations(teamId) : Promise.resolve([]),
    getTeams(),
  ]);

  const teamName = teams.find((t) => t.id === teamId)?.name ?? 'Tim';

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Tim {teamName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {members.length} anggota
            </p>
          </div>
        </div>

        {isLeader && <InviteModal teamId={teamId} />}
      </div>

      {/* Team Members Section */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Anggota</h2>
        <TeamMemberList members={members} isLeader={isLeader} />
      </section>

      {/* Invitations Section (Leader Only) */}
      {isLeader && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Undangan</h2>
          <InvitationList
            invitations={invitations}
            teamId={teamId}
            isLeader={isLeader}
          />
        </section>
      )}
    </div>
  );
}
