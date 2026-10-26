'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Users } from 'lucide-react';
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
import { createTeamAction } from '../actions/team.actions';

interface CreateTeamModalProps {
  trigger?: React.ReactNode;
}

export function CreateTeamModal({ trigger }: CreateTeamModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<Record<string, string[]> | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError({ name: ['Nama tim wajib diisi'] });
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const res = await createTeamAction({ name: trimmedName });

      if (res.success) {
        toast.success(`Tim "${trimmedName}" berhasil dibuat.`);
        setName('');
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
      console.error('Error creating team:', err);
      toast.error('Terjadi kesalahan saat membuat tim.');
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
          setName('');
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          (trigger as React.ReactElement) || (
            <Button size="sm" className="gap-2" />
          )
        }
      >
        {!trigger && (
          <>
            <Plus className="h-4 w-4" />
            <span>Tambah Tim</span>
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Buat Tim Baru</DialogTitle>
                <DialogDescription>
                  Tambahkan tim/squad baru ke dalam sistem Workhub.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="create-team-name">Nama Tim</Label>
            <Input
              id="create-team-name"
              name="name"
              placeholder="Misal: Apex, Titan, Alpha..."
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
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Buat Tim'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
