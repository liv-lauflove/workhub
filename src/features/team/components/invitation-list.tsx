'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Clock, XCircle, CheckCircle2, Ban, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { revokeInvitation } from '@/features/team/actions/team.actions';
import { cn } from 'cn';

interface Invitation {
  id: string;
  email: string;
  role: 'leader' | 'member';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
}

interface InvitationListProps {
  invitations: Invitation[];
  teamId: string;
  isLeader: boolean;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className:
      'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/30',
  },
  accepted: {
    label: 'Diterima',
    icon: CheckCircle2,
    className:
      'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30',
  },
  expired: {
    label: 'Kedaluwarsa',
    icon: XCircle,
    className: 'text-muted-foreground bg-muted',
  },
  revoked: {
    label: 'Dibatalkan',
    icon: Ban,
    className: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30',
  },
} as const;

function CopyLinkButton({ email }: { email: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      const url = `${window.location.origin}/register?email=${encodeURIComponent(email)}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      onClick={handleCopy}
      className="text-xs"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-500" />
          Tersalin
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Salin Tautan
        </>
      )}
    </Button>
  );
}

function RevokeButton({
  invitationId,
  teamId,
}: {
  invitationId: string;
  teamId: string;
}) {
  const [, formAction, isPending] = useActionState(revokeInvitation, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <input type="hidden" name="teamId" value={teamId} />
      <Button
        type="submit"
        variant="ghost"
        size="xs"
        disabled={isPending}
        className="text-destructive hover:text-destructive"
      >
        {isPending ? 'Membatalkan...' : 'Batalkan'}
      </Button>
    </form>
  );
}

export function InvitationList({
  invitations,
  teamId,
  isLeader,
}: InvitationListProps) {
  if (invitations.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Belum ada undangan yang dikirim.
      </p>
    );
  }

  return (
    <div className="divide-y rounded-lg border">
      {invitations.map((inv) => {
        const config = STATUS_CONFIG[inv.status];
        const StatusIcon = config.icon;

        return (
          <div
            key={inv.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{inv.email}</p>
              <p className="text-xs text-muted-foreground">
                {inv.role === 'leader' ? 'Leader' : 'Member'} •{' '}
                {new Date(inv.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                  config.className
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </span>

              {isLeader && inv.status === 'pending' && (
                <>
                  <CopyLinkButton email={inv.email} />
                  <RevokeButton invitationId={inv.id} teamId={teamId} />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
