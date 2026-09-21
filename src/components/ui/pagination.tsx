import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMetadata } from '@/types/global';

interface PaginationProps {
  metadata: PaginationMetadata;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  className?: string;
}

export function Pagination({
  metadata,
  basePath,
  searchParams = {},
  className = '',
}: PaginationProps) {
  const { page, totalPages, total, pageSize } = metadata;

  if (totalPages <= 1) {
    return null;
  }

  const buildUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== 'page') params.set(k, v);
    });
    params.set('page', targetPage.toString());
    const queryStr = params.toString();
    return queryStr ? `${basePath}?${queryStr}` : basePath;
  };

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t ${className}`}
    >
      <div className="text-xs text-muted-foreground">
        Menampilkan{' '}
        <span className="font-medium text-foreground">{startItem}</span> -{' '}
        <span className="font-medium text-foreground">{endItem}</span> dari{' '}
        <span className="font-medium text-foreground">{total}</span> data
        (Halaman <span className="font-medium text-foreground">{page}</span>{' '}
        dari <span className="font-medium text-foreground">{totalPages}</span>)
      </div>

      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link
            href={buildUrl(page - 1)}
            className="inline-flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Sebelumnya</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground/50 cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Sebelumnya</span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              if (totalPages <= 7) return true;
              return Math.abs(p - page) <= 1 || p === 1 || p === totalPages;
            })
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              const showEllipsis = prev && p - prev > 1;

              return (
                <React.Fragment key={p}>
                  {showEllipsis && (
                    <span className="px-1 text-xs text-muted-foreground">
                      ...
                    </span>
                  )}
                  {p === page ? (
                    <span
                      aria-current="page"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-xs"
                    >
                      {p}
                    </span>
                  ) : (
                    <Link
                      href={buildUrl(p)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
                    >
                      {p}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
        </div>

        {page < totalPages ? (
          <Link
            href={buildUrl(page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
          >
            <span>Selanjutnya</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground/50 cursor-not-allowed"
          >
            <span>Selanjutnya</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </nav>
  );
}
