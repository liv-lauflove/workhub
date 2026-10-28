import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { rateLimiter, RATE_LIMIT_CONFIGS, getClientIp } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rate Limiting Protection (Issue #70 — High Concurrency & Burst Protection)
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth');
  const isApiRoute = pathname.startsWith('/api');

  // Skip rate limiting for the internal health check so uptime monitors don't get throttled
  const isHealthCheck = pathname === '/api/health';

  if (!isHealthCheck) {
    const tier = isAuthRoute ? 'auth' : isApiRoute ? 'api' : 'standard';
    const rateConfig = RATE_LIMIT_CONFIGS[tier];
    const clientIp = getClientIp(request.headers);
    const rateLimitKey = `${clientIp}:${tier}`;

    const rateResult = rateLimiter.check(rateLimitKey, rateConfig);

    if (!rateResult.success) {
      // 429 response for API calls
      if (isApiRoute) {
        return NextResponse.json(
          {
            error: 'Too Many Requests',
            message:
              'Terlalu banyak permintaan dalam waktu singkat. Silakan coba beberapa saat lagi.',
            retryAfter: rateResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(rateResult.retryAfter),
              'X-RateLimit-Limit': String(rateResult.limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(rateResult.reset),
            },
          }
        );
      }

      // 429 response for UI page navigation
      return new NextResponse(
        `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>429 - Terlalu Banyak Permintaan — Workhub</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; text-align: center; padding: 1.5rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 1rem; padding: 2.5rem; max-width: 440px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    h1 { font-size: 1.5rem; margin-bottom: 0.75rem; color: #f43f5e; }
    p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
    .badge { display: inline-block; background: #334155; color: #38bdf8; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Batas Akses Terlampaui (429)</h1>
    <p>Sistem membatasi lonjakan request untuk menjaga stabilitas database dan server bagi seluruh pengguna.</p>
    <div class="badge">Silakan tunggu ${rateResult.retryAfter} detik</div>
  </div>
</body>
</html>`,
        {
          status: 429,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Retry-After': String(rateResult.retryAfter),
            'X-RateLimit-Limit': String(rateResult.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateResult.reset),
          },
        }
      );
    }
  }

  // 2. Session Refresh & Route Authorization Guard
  const response = await updateSession(request);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
