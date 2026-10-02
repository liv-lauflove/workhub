'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardExportButtonProps {
  className?: string;
  variant?: 'header' | 'toolbar';
}

export function DashboardExportButton({
  className = '',
  variant = 'header',
}: DashboardExportButtonProps) {
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    const toastId = toast.loading('Menyiapkan file ekspor laporan performa...');

    try {
      const q = searchParams.get('q');
      const year = searchParams.get('year');

      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (year) params.set('year', year);

      const queryStr = params.toString();
      const exportUrl = queryStr
        ? `/api/dashboard/export?${queryStr}`
        : '/api/dashboard/export';

      const response = await fetch(exportUrl, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Gagal mengunduh laporan (Status: ${response.status})`
        );
      }

      // Extract filename from Content-Disposition header if available
      let filename = 'laporan-performa-dashboard.csv';
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      // Download file via Blob
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Laporan performa kuartalan berhasil diunduh!', {
        id: toastId,
      });
    } catch (err) {
      console.error('Export download error:', err);
      toast.error(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat mengunduh laporan.',
        { id: toastId }
      );
    } finally {
      setIsExporting(false);
    }
  };

  const isToolbar = variant === 'toolbar';

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      title="Unduh rekap laporan performa & tugas kuartal ini dalam format CSV/Excel"
      aria-label="Ekspor Laporan CSV"
      className={
        className ||
        (isToolbar
          ? 'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer disabled:opacity-50'
          : 'inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer disabled:opacity-50')
      }
    >
      {isExporting ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span>Mengunduh...</span>
        </>
      ) : (
        <>
          <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Ekspor CSV</span>
        </>
      )}
    </button>
  );
}
