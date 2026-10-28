'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createProject } from '../actions/project.actions';
import { toast } from 'sonner';

export interface MilestoneOption {
  id: string;
  title: string;
}

export interface TeamOption {
  id: string;
  name: string;
}

export interface PICOption {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
}

interface CreateProjectDialogProps {
  isLeader?: boolean;
  defaultMilestoneId?: string;
  milestones?: MilestoneOption[];
  teams?: TeamOption[];
  eligiblePICs?: PICOption[];
  userTeamId?: string;
  triggerButton?: React.ReactElement;
}

export function CreateProjectDialog({
  isLeader = false,
  defaultMilestoneId = '',
  milestones = [],
  teams = [],
  eligiblePICs = [],
  userTeamId = '',
  triggerButton,
}: CreateProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<Record<string, string[]> | null>(
    null
  );

  if (!isLeader) {
    return null;
  }

  async function handleAction(formData: FormData) {
    setIsPending(true);
    setError(null);

    try {
      const res = await createProject(null, formData);

      if (res.success) {
        toast.success('Project baru berhasil dibuat!');
        setOpen(false);
        setError(null);
        router.refresh();
      } else {
        setError(res.error);
        const formError = res.error?._form?.[0];
        if (formError) {
          toast.error(formError);
        } else {
          toast.error('Gagal membuat project. Periksa kembali input form.');
        }
      }
    } catch (err) {
      console.error('Error submitting project:', err);
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
      setError({ _form: ['Terjadi kesalahan sistem. Silakan coba lagi.'] });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          triggerButton ?? (
            <Button size="sm" className="gap-1.5">
              <FolderPlus className="h-4 w-4" />
              <span>Tambah Project</span>
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat Project Baru</DialogTitle>
          <DialogDescription>
            Buat project baru yang berkontribusi di bawah target milestone
            strategis tim.
          </DialogDescription>
        </DialogHeader>

        <form action={handleAction} className="space-y-4">
          {/* Nama Project */}
          <div className="space-y-2">
            <Label htmlFor="project-name">
              Nama Project <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              name="name"
              placeholder="e.g. Redesign Dashboard UI & Layout"
              required
              disabled={isPending}
            />
            {error?.name && (
              <p className="text-xs text-destructive">{error.name[0]}</p>
            )}
          </div>

          {/* Milestone & Tim Dropdowns */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Milestone Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="project-milestone">
                Milestone Terkait <span className="text-destructive">*</span>
              </Label>
              <select
                id="project-milestone"
                name="milestoneId"
                required
                disabled={isPending}
                defaultValue={defaultMilestoneId}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
              >
                <option value="">-- Pilih Milestone --</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
              {error?.milestoneId && (
                <p className="text-xs text-destructive">
                  {error.milestoneId[0]}
                </p>
              )}
            </div>

            {/* Tim Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="project-team">
                Tim <span className="text-destructive">*</span>
              </Label>
              <select
                id="project-team"
                name="teamId"
                required
                disabled={isPending}
                defaultValue={userTeamId}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
              >
                <option value="">-- Pilih Tim --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    Tim {t.name}
                  </option>
                ))}
              </select>
              {error?.teamId && (
                <p className="text-xs text-destructive">{error.teamId[0]}</p>
              )}
            </div>
          </div>

          {/* PIC & Status Dropdowns */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* PIC Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="project-pic">Penanggung Jawab (PIC)</Label>
              <select
                id="project-pic"
                name="picId"
                disabled={isPending}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
              >
                <option value="">-- Pilih PIC (Opsional) --</option>
                {eligiblePICs.map((pic) => (
                  <option key={pic.id} value={pic.id}>
                    {pic.full_name} (
                    {pic.role === 'leader' ? 'Leader' : 'Member'})
                  </option>
                ))}
              </select>
              {error?.picId && (
                <p className="text-xs text-destructive">{error.picId[0]}</p>
              )}
            </div>

            {/* Status Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="project-status">Status Awal</Label>
              <select
                id="project-status"
                name="status"
                defaultValue="planned"
                disabled={isPending}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
              {error?.status && (
                <p className="text-xs text-destructive">{error.status[0]}</p>
              )}
            </div>
          </div>

          {/* Deskripsi */}
          <div className="space-y-2">
            <Label htmlFor="project-description">Deskripsi Project</Label>
            <Textarea
              id="project-description"
              name="description"
              placeholder="Jelaskan tujuan spesifik, deliverables, atau catatan project ini..."
              disabled={isPending}
              rows={3}
            />
            {error?.description && (
              <p className="text-xs text-destructive">{error.description[0]}</p>
            )}
          </div>

          {/* Form-level Error Alert */}
          {error?._form && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error._form[0]}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isPending}>
                  Batal
                </Button>
              }
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Buat Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
