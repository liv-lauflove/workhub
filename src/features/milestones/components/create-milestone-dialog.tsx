'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
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
import { createMilestone } from '../actions/milestone.actions';
import { toast } from 'sonner';

export interface EligiblePIC {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface CreateMilestoneDialogProps {
  isLeader?: boolean;
  eligiblePICs?: EligiblePIC[];
}

export function CreateMilestoneDialog({
  isLeader = false,
  eligiblePICs = [],
}: CreateMilestoneDialogProps) {
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
      const res = await createMilestone(null, formData);

      if (res.success) {
        toast.success('Milestone berhasil dibuat!');
        setOpen(false);
        setError(null);
        router.refresh();
      } else {
        setError(res.error);
        const formError = res.error?._form?.[0];
        if (formError) {
          toast.error(formError);
        } else {
          toast.error('Gagal membuat milestone. Periksa input form.');
        }
      }
    } catch (err) {
      console.error('Error submitting milestone:', err);
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
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="h-4 w-4" />
        <span>Buat Milestone</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat Milestone Baru</DialogTitle>
          <DialogDescription>
            Tentukan target strategis jangka panjang atau kuartalan sebagai
            payung dari berbagai project tim.
          </DialogDescription>
        </DialogHeader>

        <form action={handleAction} className="space-y-4">
          {/* Judul Milestone */}
          <div className="space-y-2">
            <Label htmlFor="milestone-title">
              Judul Milestone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="milestone-title"
              name="title"
              placeholder="e.g. Q1 2026 Core Platform Delivery"
              required
              disabled={isPending}
            />
            {error?.title && (
              <p className="text-xs text-destructive">{error.title[0]}</p>
            )}
          </div>

          {/* Deskripsi */}
          <div className="space-y-2">
            <Label htmlFor="milestone-description">Deskripsi</Label>
            <Textarea
              id="milestone-description"
              name="description"
              placeholder="Jelaskan sasaran dan ruang lingkup milestone..."
              disabled={isPending}
              rows={3}
            />
            {error?.description && (
              <p className="text-xs text-destructive">{error.description[0]}</p>
            )}
          </div>

          {/* Rentang Tanggal Mulai dan Target */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="milestone-start-date">
                Tanggal Mulai <span className="text-destructive">*</span>
              </Label>
              <Input
                id="milestone-start-date"
                name="startDate"
                type="date"
                required
                disabled={isPending}
              />
              {error?.startDate && (
                <p className="text-xs text-destructive">{error.startDate[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestone-target-date">
                Tanggal Target <span className="text-destructive">*</span>
              </Label>
              <Input
                id="milestone-target-date"
                name="targetDate"
                type="date"
                required
                disabled={isPending}
              />
              {error?.targetDate && (
                <p className="text-xs text-destructive">
                  {error.targetDate[0]}
                </p>
              )}
            </div>
          </div>

          {/* PIC Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="milestone-pic">Penanggung Jawab (PIC)</Label>
            <select
              id="milestone-pic"
              name="picId"
              disabled={isPending}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
            >
              <option value="">-- Pilih PIC (Opsional) --</option>
              {eligiblePICs.map((pic) => (
                <option key={pic.id} value={pic.id}>
                  {pic.full_name} ({pic.role === 'leader' ? 'Leader' : 'Member'}
                  )
                </option>
              ))}
            </select>
            {error?.picId && (
              <p className="text-xs text-destructive">{error.picId[0]}</p>
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
                'Buat Milestone'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
