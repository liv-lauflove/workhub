'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Loader2 } from 'lucide-react';
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
import { archiveProject } from '../actions/project.actions';
import { toast } from 'sonner';

interface ArchiveProjectDialogProps {
  projectId: string;
  projectName: string;
  milestoneId?: string | null;
  isLeader?: boolean;
}

export function ArchiveProjectDialog({
  projectId,
  projectName,
  milestoneId,
  isLeader = true,
}: ArchiveProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  if (!isLeader) {
    return null;
  }

  async function handleArchive() {
    setIsPending(true);
    try {
      const result = await archiveProject(projectId);
      if (!result.success) {
        toast.error(result.error?._form?.[0] || 'Gagal mengarsipkan project.');
        return;
      }

      toast.success(`Project "${projectName}" berhasil diarsipkan.`);
      setOpen(false);
      const targetUrl = milestoneId
        ? `/projects?milestone_id=${milestoneId}`
        : '/projects';
      router.push(targetUrl);
      router.refresh();
    } catch (err) {
      console.error('Error archiving project:', err);
      toast.error('Terjadi kesalahan tak terduga saat mengarsipkan project.');
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
            className="gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/30"
          />
        }
      >
        <Archive className="h-4 w-4" />
        <span>Arsipkan</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Archive className="h-5 w-5 text-amber-500" />
            <span>Arsipkan Project</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Apakah Anda yakin ingin mengarsipkan project{' '}
            <strong className="text-foreground font-semibold">
              &quot;{projectName}&quot;
            </strong>
            ? Project yang diarsipkan beserta seluruh task-nya tidak akan tampil
            di daftar aktif, namun dapat dipulihkan kapan saja melalui halaman
            Arsip.
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
            variant="destructive"
            onClick={handleArchive}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mengarsipkan...</span>
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                <span>Ya, Arsipkan</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
