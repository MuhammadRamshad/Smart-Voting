/**
 * Token-bucket rate limiter for Next.js API routes.
 * Operates purely in-memory (per process). For multi-instance deployments,
 * swap the ipRequestMap for a Redis-backed store.
 *
 * This is an independent first line of bot defense — before the AI layer.
 */

interface BucketEntry {
  count: number;
  resetAt: number;
}

const ipRequestMap = new Map<string, BucketEntry>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  options: RateLimitOptions
): (ip: string) => RateLimitResult {
  return function checkRateLimit(ip: string): RateLimitResult {
    const now = Date.now();
    const existing = ipRequestMap.get(ip);

    if (!existing || now > existing.resetAt) {
      const entry: BucketEntry = { count: 1, resetAt: now + options.windowMs };
      ipRequestMap.set(ip, entry);
      return { allowed: true, remaining: options.max - 1, resetAt: entry.resetAt };
    }

    if (existing.count >= options.max) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count++;
    return {
      allowed: true,
      remaining: options.max - existing.count,
      resetAt: existing.resetAt,
    };
  };
}

// ─── Pre-configured limiters ─────────────────────────────────────────────────

/** 5 vote attempts per 5-minute window */
export const voteRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 5 });

/** 3 OTP requests per 10-minute window */
export const otpRateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 3 });

/** 10 face-verify attempts per 5-minute window */
export const faceVerifyRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
});
