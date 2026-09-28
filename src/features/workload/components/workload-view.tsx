'use client';

import * as React from 'react';
import { BarChart3, RefreshCw, Users, ShieldAlert } from 'lucide-react';
import type { TeamWorkloadSummary } from '../types/workload.types';
import { TeamWorkloadList } from './team-workload-list';
import { getTeamWorkloadAction } from '../actions/workload.actions';
import { toast } from 'sonner';

interface WorkloadViewProps {
  initialWorkload: TeamWorkloadSummary | null;
  userRole?: string;
}

export function WorkloadView({
  initialWorkload,
  userRole = 'member',
}: WorkloadViewProps) {
  const [workload, setWorkload] = React.useState<TeamWorkloadSummary | null>(
    initialWorkload
  );
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Synchronize internal state if initialWorkload prop changes
  const [prevInitial, setPrevInitial] = React.useState(initialWorkload);
  if (initialWorkload !== prevInitial) {
    setPrevInitial(initialWorkload);
    setWorkload(initialWorkload);
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await getTeamWorkloadAction(workload?.teamId);
      if (result.success) {
        if (result.data) {
          setWorkload(result.data);
          toast.success('Data beban kerja berhasil diperbarui.');
        }
      } else {
        toast.error(
          result.error?._form?.[0] || 'Gagal memperbarui beban kerja tim.'
        );
      }
    } catch {
      toast.error('Koneksi terputus saat memperbarui data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // 1. User has no team assigned
  if (!workload) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Workload & Kapasitas
            </h1>
            <p className="text-xs text-muted-foreground">
              Pemantauan kapasitas kerja tim
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-10 text-center shadow-xs">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-base font-semibold text-foreground">
            Belum Bergabung ke Tim
          </h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Kamu belum tergabung ke tim manapun sehingga data beban kerja belum
            tersedia. Hubungi Team Leader untuk mendapatkan undangan bergabung.
          </p>
        </div>
      </div>
    );
  }

  // 2. Normal View with Team Workload
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Workload & Kapasitas
              </h1>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Tim {workload.teamName}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kalkulasi beban kerja real-time berdasarkan bobot prioritas task
              aktif (High: 3, Med: 2, Low: 1, Urgent: 4).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {userRole === 'leader' && workload.overloadedMembersCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2.5 py-1.5">
              <ShieldAlert className="h-4 w-4" />
              <span>{workload.overloadedMembersCount} Overload</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted transition-colors disabled:opacity-50"
            title="Muat ulang kalkulasi kapasitas real-time"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>{isRefreshing ? 'Memperbarui...' : 'Segarkan'}</span>
          </button>
        </div>
      </div>

      {/* Main Team Workload Component */}
      <TeamWorkloadList workload={workload} />
    </div>
  );
}
