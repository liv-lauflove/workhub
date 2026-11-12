'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { restoreMilestone } from '@/features/milestones/actions/milestone.actions';
import { restoreProject } from '@/features/projects/actions/project.actions';
import { toast } from 'sonner';

interface RestoreButtonProps {
  type: 'milestone' | 'project';
  id: string;
  name: string;
  isLeader?: boolean;
}

export function RestoreButton({
  type,
  id,
  name,
  isLeader = false,
}: RestoreButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  if (!isLeader) {
    return null;
  }

  const itemTypeLabel = type === 'milestone' ? 'Milestone' : 'Project';

  async function handleRestore() {
    setIsPending(true);
    try {
      const res =
        type === 'milestone'
          ? await restoreMilestone(id)
          : await restoreProject(id);

      if (!res.success) {
        toast.error(
          res.error?._form?.[0] ||
            `Gagal memulihkan ${itemTypeLabel.toLowerCase()}.`
        );
        return;
      }

      toast.success(
        `${itemTypeLabel} "${name}" berhasil dipulihkan ke daftar aktif.`
      );
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error(`Error restoring ${type}:`, err);
      toast.error(
        `Terjadi kesalahan sistem saat memulihkan ${itemTypeLabel.toLowerCase()}.`
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-500/30"
          />
        }
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Pulihkan</span>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <RotateCcw className="h-5 w-5 text-emerald-500" />
            <span>Pulihkan {itemTypeLabel}</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Apakah Anda yakin ingin memulihkan {itemTypeLabel.toLowerCase()}{' '}
            <strong className="text-foreground font-semibold">
              &quot;{name}&quot;
            </strong>
            ? Item ini akan dikembalikan ke daftar aktif dan dapat diakses
            kembali oleh tim.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <DialogClose
            render={
              <Button type="button" variant="outline" disabled={isPending}>
                Batal
              </Button>
            }
          />
          <Button
            type="button"
            onClick={handleRestore}
            disabled={isPending}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memulihkan...</span>
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                <span>Ya, Pulihkan</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
