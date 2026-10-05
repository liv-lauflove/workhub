import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDashboardExportData } from '@/features/dashboard/queries/dashboard.queries';
import { generateDashboardCsv } from '@/features/dashboard/lib/export.utils';
import type { QuarterFilter } from '@/features/dashboard/types/dashboard.types';

/**
 * GET /api/dashboard/export
 *
 * Generates and downloads a CSV export file containing executive summary,
 * quarterly metrics, priority breakdown, team workload, and task items.
 * (PRD §9.5, Issue #33)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Sesi autentikasi tidak valid atau telah berakhir.' },
        { status: 401 }
      );
    }

    // 2. Fetch user profile & team context
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, team_id')
      .eq('id', user.id)
      .single();

    if (!profile?.team_id) {
      return NextResponse.json(
        {
          error:
            'Kamu belum tergabung ke tim manapun untuk mengekspor data performa.',
        },
        { status: 400 }
      );
    }

    // 3. Parse query filters (quarter and year)
    const { searchParams } = request.nextUrl;
    const qParam = searchParams.get('q');
    const yearParam = searchParams.get('year');

    const parsedQ = qParam ? parseInt(qParam, 10) : undefined;
    const quarter =
      parsedQ && [1, 2, 3, 4].includes(parsedQ)
        ? (parsedQ as 1 | 2 | 3 | 4)
        : undefined;

    const parsedYear = yearParam ? parseInt(yearParam, 10) : undefined;
    const year =
      parsedYear &&
      !isNaN(parsedYear) &&
      parsedYear >= 2000 &&
      parsedYear <= 2100
        ? parsedYear
        : undefined;

    const filters: QuarterFilter = {
      quarter,
      year,
    };

    // 4. Fetch aggregated performance and itemized tasks
    const exportData = await getDashboardExportData(profile.team_id, filters);

    if (!exportData) {
      return NextResponse.json(
        { error: 'Data laporan performa tim tidak ditemukan.' },
        { status: 404 }
      );
    }

    // 5. Generate formatted CSV string
    const csvContent = generateDashboardCsv(
      exportData.performanceData,
      exportData.tasks,
      profile.full_name || user.email || 'Pengguna'
    );

    // 6. Build file name: laporan-performa-[quarter]-[team].csv
    const sanitizedQuarter =
      exportData.performanceData.currentQuarter.label.replace(/\s+/g, '-');
    const sanitizedTeam = exportData.performanceData.teamName
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '-');
    const filename = `laporan-performa-${sanitizedQuarter}-${sanitizedTeam}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating dashboard CSV export:', error);
    return NextResponse.json(
      { error: 'Gagal men-generate file ekspor laporan performa.' },
      { status: 500 }
    );
  }
}
