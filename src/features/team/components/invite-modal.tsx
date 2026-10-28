'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { toast } from 'sonner';
import { inviteTeamMember } from '@/features/team/actions/team.actions';

interface InviteModalProps {
  teamId: string;
  teams?: Array<{ id: string; name: string }>;
  isManagement?: boolean;
}

export function InviteModal({
  teamId,
  teams = [],
  isManagement = false,
}: InviteModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<Record<string, string[]> | null>(
    null
  );

  async function handleAction(formData: FormData) {
    setIsPending(true);
    setError(null);
    try {
      const email = (formData.get('email') as string)?.trim();
      const role = (formData.get('role') as 'leader' | 'member') || 'member';
      const targetTeamId = (formData.get('teamId') as string)?.trim() || teamId;

      console.log('🚀 [InviteModal] Submitting form:', {
        email,
        role,
        teamId: targetTeamId,
      });

      const res = await inviteTeamMember({ email, role, teamId: targetTeamId });
      console.log('🚀 [InviteModal] Response received:', res);

      if (res.success) {
        setOpen(false);
        toast.success(
          'Undangan berhasil dibuat. Silakan salin tautan pendaftaran untuk calon anggota.'
        );
        router.refresh();
      } else {
        setError(res.error);
        if (res.error?._form?.[0]) {
          toast.error(res.error._form[0]);
        }
      }
    } catch (err) {
      console.error('🚀 [InviteModal] Unhandled error:', err);
      setError({ _form: ['Terjadi kesalahan. Silakan coba lagi.'] });
      toast.error('Terjadi kesalahan saat membuat undangan.');
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
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlus className="h-4 w-4" />
        Undang Anggota
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Undang Anggota Baru</DialogTitle>
          <DialogDescription>
            Kirim undangan ke email calon anggota tim. Undangan akan berstatus
            pending dan Anda dapat membagikan tautan registrasi mandiri untuk
            calon anggota.
          </DialogDescription>
        </DialogHeader>

        <form action={handleAction} className="space-y-4">
          {isManagement && teams.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="invite-team">Tim Tujuan</Label>
              <select
                id="invite-team"
                name="teamId"
                defaultValue={teamId}
                disabled={isPending}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    Tim {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="teamId" value={teamId} />
          )}

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
