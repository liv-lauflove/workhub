'use client';

import * as React from 'react';
import { UserPlus } from 'lucide-react';
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
import { inviteTeamMember } from '@/features/team/actions/team.actions';

interface InviteModalProps {
  teamId: string;
}

export function InviteModal({ teamId }: InviteModalProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<Record<string, string[]> | null>(
    null
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await inviteTeamMember(null, formData);
      if (res.success) {
        setOpen(false);
        setError(null);
      } else {
        setError(res.error);
      }
    });
  };

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
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlus className="h-4 w-4" />
        Undang Anggota
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Undang Anggota Baru</DialogTitle>
          <DialogDescription>
            Kirim undangan ke email calon anggota tim. Mereka akan menerima
            tautan untuk bergabung.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="teamId" value={teamId} />

          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder="anggota@email.com"
              required
              disabled={isPending}
            />
            {error?.email && (
              <p className="text-xs text-destructive">{error.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              name="role"
              defaultValue="member"
              disabled={isPending}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
            >
              <option value="member">Member</option>
              <option value="leader">Leader</option>
            </select>
            {error?.role && (
              <p className="text-xs text-destructive">{error.role[0]}</p>
            )}
          </div>

          {error?._form && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error._form[0]}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Mengirim...' : 'Kirim Undangan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
