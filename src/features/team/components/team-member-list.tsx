'use client';

import { useState, useTransition } from 'react';
import {
  User as UserIcon,
  Crown,
  MoreHorizontal,
  Gauge,
  Sliders,
  Briefcase,
} from 'lucide-react';
import {
  updateMemberRole,
  updateMemberCapacity,
} from '../actions/team.actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  full_name: string;
  role: 'leader' | 'member';
  avatar_url: string | null;
  github_username: string | null;
  created_at: string;
  team_id?: string | null;
  position?: string | null;
  capacity_points?: number | null;
}

interface TeamMemberListProps {
  members: TeamMember[];
  isLeader?: boolean;
  teamId?: string;
}

const PRESET_CAPACITY_OPTIONS = [
  { label: 'Standar Member', points: 100 },
  { label: 'Specialist', points: 150 },
  { label: 'Principal / Lead', points: 250 },
  { label: 'Manager / Head', points: 300 },
];

export function TeamMemberList({
  members,
  isLeader = false,
  teamId,
}: TeamMemberListProps) {
  const [isPending, startTransition] = useTransition();
  const [capacityModalMember, setCapacityModalMember] =
    useState<TeamMember | null>(null);
  const [capacityPointsInput, setCapacityPointsInput] = useState<number>(100);
  const [isSavingCapacity, setIsSavingCapacity] = useState<boolean>(false);

  const handleRoleChange = (
    member: TeamMember,
    newRole: 'leader' | 'member'
  ) => {
    if (member.role === newRole) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('userId', member.id);
      formData.append('role', newRole);
      formData.append('teamId', member.team_id || teamId || '');

      const result = await updateMemberRole(null, formData);
      if (!result.success) {
        toast.error(result.error?._form?.[0] || 'Gagal mengubah role');
      } else {
        toast.success(
          `Role ${member.full_name} berhasil diubah menjadi ${newRole}`
        );
      }
    });
  };

  const handleOpenCapacityModal = (member: TeamMember) => {
    setCapacityModalMember(member);
    setCapacityPointsInput(member.capacity_points ?? 100);
  };

  const handleSaveCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capacityModalMember) return;

    if (capacityPointsInput < 10 || capacityPointsInput > 1000) {
      toast.error('Kapasitas poin harus di antara 10 hingga 1000 poin.');
      return;
    }

    setIsSavingCapacity(true);
    try {
      const formData = new FormData();
      formData.append('userId', capacityModalMember.id);
      formData.append('teamId', capacityModalMember.team_id || teamId || '');
      formData.append('capacityPoints', capacityPointsInput.toString());

      const res = await updateMemberCapacity(null, formData);
      if (!res.success) {
        const errorMsg =
          res.error?._form?.[0] ||
          res.error?.capacityPoints?.[0] ||
          'Gagal memperbarui kapasitas poin.';
        toast.error(errorMsg);
      } else {
        toast.success(
          `Kapasitas ${capacityModalMember.full_name} berhasil diatur ke ${capacityPointsInput} poin.`
        );
        setCapacityModalMember(null);
      }
    } catch (err) {
      console.error('Error saving member capacity:', err);
      toast.error('Terjadi kesalahan saat menyimpan kapasitas.');
    } finally {
      setIsSavingCapacity(false);
    }
  };

  if (members.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Belum ada anggota di tim ini.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Anggota</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Kapasitas Poin</TableHead>
              <TableHead className="hidden sm:table-cell">Bergabung</TableHead>
              {isLeader && (
                <TableHead className="w-[80px] text-right">Aksi</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                {/* 1. Member Profile & Name */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    {member.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        className="h-9 w-9 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.full_name}
                      </p>
                      {member.github_username && (
                        <p className="truncate text-xs text-muted-foreground">
                          @{member.github_username}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* 2. Job Position */}
                <TableCell>
                  {member.position ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 border border-border/50 px-2 py-0.5 text-xs font-medium text-foreground">
                      <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{member.position}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">
                      -
                    </span>
                  )}
                </TableCell>

                {/* 3. Team Role Badge */}
                <TableCell>
                  {member.role === 'leader' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Crown className="h-3 w-3" />
                      Leader
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      Member
                    </span>
                  )}
                </TableCell>

                {/* 4. Capacity Points */}
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    <Gauge className="h-3 w-3 shrink-0" />
                    <span>{member.capacity_points ?? 100} Poin</span>
                  </span>
                </TableCell>

                {/* 5. Joined Date */}
                <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                  {new Date(member.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>

                {/* 6. Actions (Leader Only) */}
                {isLeader && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={isPending}
                          />
                        }
                      >
                        <span className="sr-only">Buka menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {/* Action: Edit Capacity Points */}
                        <DropdownMenuItem
                          onClick={() => handleOpenCapacityModal(member)}
                          className="cursor-pointer"
                        >
                          <Sliders className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span>Atur Kapasitas Poin</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Action: Toggle Leader / Member */}
                        {member.role === 'member' ? (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member, 'leader')}
                            className="cursor-pointer"
                          >
                            <Crown className="mr-2 h-4 w-4 text-amber-500" />
                            <span>Jadikan Leader</span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member, 'member')}
                            className="cursor-pointer"
                          >
                            <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>Jadikan Member</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Capacity Points Dialog Modal */}
      <Dialog
        open={Boolean(capacityModalMember)}
        onOpenChange={(open) => {
          if (!open) setCapacityModalMember(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Gauge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Atur Kapasitas Poin Beban Kerja</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tentukan kuota batas poin maksimal beban kerja untuk{' '}
              <strong className="text-foreground">
                {capacityModalMember?.full_name}
              </strong>
              . Member akan ditandai mengalami overload jika total poin task
              aktif melebihi 80% dari kuota ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCapacity} className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="capacityPoints"
                  className="text-xs font-semibold"
                >
                  Kuota Kapasitas (Poin)
                </Label>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {capacityPointsInput} Poin
                </span>
              </div>
              <Input
                id="capacityPoints"
                type="number"
                min={10}
                max={1000}
                step={10}
                value={capacityPointsInput}
                onChange={(e) =>
                  setCapacityPointsInput(parseInt(e.target.value, 10) || 0)
                }
                className="text-sm font-semibold"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Nilai minimal 10 poin, maksimal 1000 poin.
              </p>
            </div>

            {/* Quick Preset Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Preset Cepat Berdasarkan Jabatan:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_CAPACITY_OPTIONS.map((preset) => (
                  <button
                    key={preset.points}
                    type="button"
                    onClick={() => setCapacityPointsInput(preset.points)}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                      capacityPointsInput === preset.points
                        ? 'border-blue-500 bg-blue-500/10 font-semibold text-blue-700 dark:text-blue-300'
                        : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span>{preset.label}</span>
                    <span className="font-bold">{preset.points} pts</span>
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCapacityModalMember(null)}
                disabled={isSavingCapacity}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingCapacity || capacityPointsInput <= 0}
              >
                {isSavingCapacity ? 'Menyimpan...' : 'Simpan Kapasitas'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
