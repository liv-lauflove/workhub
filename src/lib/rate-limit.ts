/**
 * In-memory sliding window rate limiter for Next.js middleware and API routes.
 * Protects database connections and server resources against burst spikes,
 * brute-force attacks, and request flooding (PRD §11 & Issue #70).
 */

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Window duration in milliseconds (e.g. 60_000 for 1 minute) */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds when quota resets
  retryAfter: number; // Seconds to wait before retry
}

interface ClientBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * In-memory token bucket store with automatic cleanup to prevent memory bloat.
 */
class TokenBucketRateLimiter {
  private buckets = new Map<string, ClientBucket>();
  private lastCleanup = Date.now();
  private readonly cleanupInterval = 60_000; // Cleanup every 1 minute

  /**
   * Check and consume rate limit for a client identifier.
   */
  check(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    this.maybeCleanup(config.windowMs);

    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      bucket = {
        tokens: config.limit,
        lastRefill: now,
      };
      this.buckets.set(identifier, bucket);
    } else {
      // Calculate token refill based on elapsed time
      const elapsed = now - bucket.lastRefill;
      const tokensToAdd = (elapsed / config.windowMs) * config.limit;

      bucket.tokens = Math.min(config.limit, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    const reset = Math.ceil((now + config.windowMs) / 1000);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        success: true,
        limit: config.limit,
        remaining: Math.floor(bucket.tokens),
        reset,
        retryAfter: 0,
      };
    }

    // Rate limit exceeded
    const retryAfter = Math.max(
      1,
      Math.ceil((1 - bucket.tokens) * (config.windowMs / config.limit / 1000))
    );

    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset,
      retryAfter,
    };
  }

  /**
   * Periodically remove stale client entries to keep memory footprint minimal.
   */
  private maybeCleanup(maxAge: number) {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) return;

    this.lastCleanup = now;
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge * 2) {
        this.buckets.delete(key);
      }
    }
  }
}

// Global singleton rate limiter instance
export const rateLimiter = new TokenBucketRateLimiter();

/**
 * Standard rate limit configurations for different route tiers.
 */
export const RATE_LIMIT_CONFIGS = {
  /** General routes: 120 requests per minute */
  standard: {
    limit: 120,
    windowMs: 60_000,
  },
  /** Sensitive auth routes (/login, /register, /auth): 20 requests per minute */
  auth: {
    limit: 20,
    windowMs: 60_000,
  },
  /** API endpoints: 60 requests per minute */
  api: {
    limit: 60,
    windowMs: 60_000,
  },
} as const;

/**
 * Extract client IP address from Next.js request headers.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return '127.0.0.1';
}
