'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  React.useEffect(() => {
    console.error('Dashboard Error Boundary Caught:', error);
  }, [error]);

  const isJwtSkew =
    error.message?.includes('PGRST303') ||
    error.message?.includes('JWT issued at future');

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-16 text-center space-y-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-xs">
        <AlertTriangle className="h-7 w-7" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight">
          Terjadi Kesalahan Saat Memuat Halaman
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {isJwtSkew
            ? 'Terjadi sinkronisasi waktu sesi login. Silakan klik tombol di bawah untuk memuat ulang.'
            : error.message ||
              'Gagal mengambil data dari server. Silakan coba muat ulang atau kembali ke halaman sebelumnya.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          onClick={() => {
            reset();
            router.refresh();
          }}
          variant="default"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Coba Lagi</span>
        </Button>

        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'flex items-center gap-1.5'
          )}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
