'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Calendar, RotateCcw, Filter } from 'lucide-react';

interface DashboardFilterProps {
  currentQuarter: number; // 1 | 2 | 3 | 4
  currentYear: number;
  availableYears?: number[];
  className?: string;
}

const QUARTER_OPTIONS = [
  { value: 1, label: 'Q1 (Jan – Mar)' },
  { value: 2, label: 'Q2 (Apr – Jun)' },
  { value: 3, label: 'Q3 (Jul – Sep)' },
  { value: 4, label: 'Q4 (Okt – Des)' },
] as const;

export function DashboardFilter({
  currentQuarter,
  currentYear,
  availableYears,
  className = '',
}: DashboardFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // 1. Resolve active selections from search params or fallback to props
  const paramQ = searchParams.get('q');
  const paramYear = searchParams.get('year');

  const selectedQuarter = React.useMemo(() => {
    if (paramQ) {
      const parsed = parseInt(paramQ, 10);
      if ([1, 2, 3, 4].includes(parsed)) return parsed as 1 | 2 | 3 | 4;
    }
    return currentQuarter;
  }, [paramQ, currentQuarter]);

  const selectedYear = React.useMemo(() => {
    if (paramYear) {
      const parsed = parseInt(paramYear, 10);
      if (!isNaN(parsed) && parsed >= 2000 && parsed <= 2100) return parsed;
    }
    return currentYear;
  }, [paramYear, currentYear]);

  // Dynamic years list: default e.g. 2024, 2025, 2026, 2027 or range around currentYear
  const yearOptions = React.useMemo(() => {
    if (availableYears && availableYears.length > 0) {
      return availableYears;
    }
    const baseYear = currentYear || new Date().getFullYear();
    const years = [baseYear - 1, baseYear, baseYear + 1, baseYear + 2];
    // Include selectedYear if not in list
    if (!years.includes(selectedYear)) {
      years.push(selectedYear);
      years.sort((a, b) => a - b);
    }
    return Array.from(new Set(years)).sort((a, b) => a - b);
  }, [availableYears, currentYear, selectedYear]);

  // Today's real quarter and year for reset detection
  const today = new Date();
  const realCurrentQuarter = (Math.floor(today.getMonth() / 3) + 1) as
    1 | 2 | 3 | 4;
  const realCurrentYear = today.getFullYear();

  const isFiltered =
    selectedQuarter !== realCurrentQuarter || selectedYear !== realCurrentYear;

  // 2. Navigation handler: pushes updated search params to URL
  const updateQueryParams = (newQuarter: number, newYear: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('q', newQuarter.toString());
    params.set('year', newYear.toString());

    // Preserve current path (e.g. '/' or '/dashboard')
    const targetPath = pathname || '/';
    router.push(`${targetPath}?${params.toString()}`, { scroll: false });
  };

  const handleQuarterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newQuarter = parseInt(e.target.value, 10);
    if ([1, 2, 3, 4].includes(newQuarter)) {
      updateQueryParams(newQuarter, selectedYear);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    if (!isNaN(newYear)) {
      updateQueryParams(selectedQuarter, newYear);
    }
  };

  const handleReset = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('year');
    const query = params.toString();
    const targetPath = pathname || '/';
    router.push(query ? `${targetPath}?${query}` : targetPath, {
      scroll: false,
    });
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 sm:gap-3 ${className}`}
      role="search"
      aria-label="Filter periode dashboard"
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Filter className="h-3.5 w-3.5 text-primary" />
        <span className="hidden sm:inline">Filter:</span>
      </div>

      {/* Quarter Selector */}
      <div className="relative inline-flex items-center">
        <Calendar className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <select
          id="dashboard-filter-quarter"
          value={selectedQuarter}
          onChange={handleQuarterChange}
          aria-label="Pilih Kuartal"
          className="h-8 rounded-lg border border-input bg-card pl-8 pr-7 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted/50 focus:border-ring focus:ring-2 focus:ring-ring/50 outline-hidden cursor-pointer"
        >
          {QUARTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Year Selector */}
      <div className="relative inline-flex items-center">
        <select
          id="dashboard-filter-year"
          value={selectedYear}
          onChange={handleYearChange}
          aria-label="Pilih Tahun"
          className="h-8 rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted/50 focus:border-ring focus:ring-2 focus:ring-ring/50 outline-hidden cursor-pointer"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Reset button if filter is active */}
      {isFiltered && (
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shadow-2xs"
          title="Kembalikan ke kuartal dan tahun saat ini"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Kuartal Ini</span>
        </button>
      )}
    </div>
  );
}
