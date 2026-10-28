import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/health
 *
 * Health check & observability endpoint untuk monitoring status server,
 * performa memori, dan latensi koneksi database PostgreSQL / Connection Pooler (Issue #70).
 */
export async function GET() {
  const start = Date.now();

  // Collect Node.js process memory metrics (vital for 200+ concurrent user monitoring)
  const memUsage = process.memoryUsage();
  const memoryMetrics = {
    heap_used_mb: Math.round((memUsage.heapUsed / 1024 / 1024) * 10) / 10,
    heap_total_mb: Math.round((memUsage.heapTotal / 1024 / 1024) * 10) / 10,
    rss_mb: Math.round((memUsage.rss / 1024 / 1024) * 10) / 10,
  };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('teams').select('id').limit(1);

    const dbLatencyMs = Date.now() - start;

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          uptime_seconds: Math.floor(process.uptime()),
          memory: memoryMetrics,
          database: {
            connected: false,
            error: error.message,
            latency_ms: dbLatencyMs,
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      memory: memoryMetrics,
      database: {
        connected: true,
        latency_ms: dbLatencyMs,
      },
      concurrency_protection: {
        rate_limiter: 'active',
        pooler_port: 6543,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        memory: memoryMetrics,
        database: {
          connected: false,
          error: err instanceof Error ? err.message : 'Unknown database error',
        },
      },
      { status: 503 }
    );
  }
}
