'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { updateTeamAction } from '../actions/team.actions';

interface EditTeamModalProps {
  team: {
    id: string;
    name: string;
    isManagement?: boolean;
  };
  trigger?: React.ReactNode;
}

export function EditTeamModal({ team, trigger }: EditTeamModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(team.name);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<Record<string, string[]> | null>(
    null
  );

  // If this is the protected Management team, do not allow editing
  if (team.isManagement) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
        title="Tim sistem 'Management' terkunci dan tidak dapat diubah namanya."
      >
        <Lock className="h-3 w-3" />
        <span>Terkunci</span>
      </span>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError({ name: ['Nama tim wajib diisi'] });
      return;
    }

    if (trimmedName === team.name) {
      setOpen(false);
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const res = await updateTeamAction({
        teamId: team.id,
        name: trimmedName,
      });

      if (res.success) {
        toast.success(`Nama tim berhasil diubah menjadi "${trimmedName}".`);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error || null);
        if (res.error?._form?.[0]) {
          toast.error(res.error._form[0]);
        } else if (res.error?.name?.[0]) {
          toast.error(res.error.name[0]);
        }
      }
    } catch (err) {
      console.error('Error updating team:', err);
      toast.error('Terjadi kesalahan saat mengubah nama tim.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setName(team.name);
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          (trigger as React.ReactElement) || (
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-foreground"
              title="Edit nama tim"
            />
          )
        }
      >
        {!trigger && (
          <>
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Edit tim {team.name}</span>
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit Nama Tim</DialogTitle>
            <DialogDescription>
              Ubah nama tim {team.name}. Perubahan ini akan otomatis diperbarui
              di seluruh proyek dan anggota tim terkait.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="edit-team-name">Nama Tim</Label>
            <Input
              id="edit-team-name"
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              disabled={isPending}
              autoFocus
            />
            {error?.name && (
              <p className="text-xs text-destructive">{error.name[0]}</p>
            )}
            {error?._form && (
              <p className="text-xs text-destructive">{error._form[0]}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || !name.trim() || name.trim() === team.name}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
