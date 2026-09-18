import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/health
 *
 * Health check endpoint untuk monitoring status server dan konektivitas
 * database. Digunakan oleh load balancer, uptime monitor, atau CI/CD.
 */
export async function GET() {
  const start = Date.now();

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('teams').select('id').limit(1);

    const dbLatencyMs = Date.now() - start;

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          database: { connected: false, error: error.message },
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: { connected: true, latency_ms: dbLatencyMs },
    });
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: { connected: false },
      },
      { status: 503 }
    );
  }
}
