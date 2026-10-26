'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  Shield,
  Crown,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TeamWithStats } from '../queries/team.queries';
import { CreateTeamModal } from './create-team-modal';
import { EditTeamModal } from './edit-team-modal';

interface TeamCardGridProps {
  teams: TeamWithStats[];
  isManagement: boolean;
}

export function TeamCardGrid({ teams, isManagement }: TeamCardGridProps) {
  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Daftar Tim
          </h2>
          <p className="text-sm text-muted-foreground">
            {teams.length} tim terdaftar dalam sistem Workhub.
          </p>
        </div>

        {isManagement && <CreateTeamModal />}
      </div>

      {/* Grid of Team Cards */}
      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-base font-semibold">Belum Ada Tim</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Belum ada tim yang dibuat. Buat tim baru untuk memulai alokasi
            proyek dan anggota.
          </p>
          {isManagement && (
            <div className="mt-4">
              <CreateTeamModal />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const isSystemManagement = team.isManagement;

            return (
              <div
                key={team.id}
                className="group relative flex flex-col justify-between rounded-xl border bg-card p-6 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md"
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon and Badge */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`rounded-lg p-2.5 ${
                        isSystemManagement
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {isSystemManagement ? (
                        <Shield className="h-5 w-5" />
                      ) : team.name.toLowerCase() === 'aegis' ? (
                        <Sparkles className="h-5 w-5" />
                      ) : (
                        <Layers className="h-5 w-5" />
                      )}
                    </div>

                    {isSystemManagement ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        Management
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {team.memberCount} Anggota
                      </span>
                    )}
                  </div>

                  {/* Team Name and Edit Button */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-bold tracking-tight text-foreground">
                        Tim {team.name}
                      </h3>
                      {isManagement && (
                        <EditTeamModal
                          team={{
                            id: team.id,
                            name: team.name,
                            isManagement: isSystemManagement,
                          }}
                        />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isSystemManagement
                        ? 'Tim kepemimpinan, arsitektur, dan supervisi teknis.'
                        : `Squad pengembangan fitur dan delivery sprint.`}
                    </p>
                  </div>

                  {/* Leaders and Info */}
                  <div className="space-y-2 border-t pt-3 text-xs">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <div>
                        <span className="font-medium text-foreground">
                          Team Lead:{' '}
                        </span>
                        {team.leaders.length > 0 ? (
                          <span className="text-foreground">
                            {team.leaders.join(', ')}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground">
                            Belum ada leader
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        <span className="font-medium text-foreground">
                          {team.memberCount}
                        </span>{' '}
                        anggota aktif
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-5">
                  <Link
                    href={`/team?team=${team.name.toLowerCase()}`}
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-full justify-between transition-colors group-hover:border-primary group-hover:bg-primary/5'
                    )}
                  >
                    <span>Lihat Anggota</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
