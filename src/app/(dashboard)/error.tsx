'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log the error to console or error reporting service
    console.error('Dashboard Error Boundary Caught:', error);
  }, [error]);

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
          {error.message ||
            'Gagal mengambil data dari server. Silakan coba muat ulang atau kembali ke halaman sebelumnya.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          onClick={() => reset()}
          variant="default"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Coba Lagi</span>
        </Button>

        <Button variant="outline" render={<Link href="/" />}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          <span>Kembali ke Dashboard</span>
        </Button>
      </div>
    </div>
  );
}
