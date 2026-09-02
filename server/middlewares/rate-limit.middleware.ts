import { Request, Response, NextFunction } from 'express';

/**
 * Minimal dependency-free fixed-window rate limiter for authentication endpoints.
 * The API binds to loopback, so the practical key is the machine itself — this exists
 * to make PIN / password brute-forcing infeasible (a 4-digit PIN is only 10k combos).
 */
interface Bucket {
  count: number;
  resetAt: number;
  blockedUntil: number;
}

const buckets = new Map<string, Bucket>();

// Periodically evict stale buckets so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.resetAt < now && b.blockedUntil < now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  blockMs: number;
  keyPrefix: string;
}

export function rateLimit(opts: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = `${opts.keyPrefix}:${req.ip || 'unknown'}`;
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + opts.windowMs, blockedUntil: bucket?.blockedUntil || 0 };
      buckets.set(key, bucket);
    }

    if (bucket.blockedUntil > now) {
      const retrySec = Math.ceil((bucket.blockedUntil - now) / 1000);
      res.setHeader('Retry-After', String(retrySec));
      res.status(429).json({
        success: false,
        message: `Too many attempts. Try again in ${retrySec} seconds.`,
      });
      return;
    }

    bucket.count += 1;
    if (bucket.count > opts.max) {
      bucket.blockedUntil = now + opts.blockMs;
      const retrySec = Math.ceil(opts.blockMs / 1000);
      res.setHeader('Retry-After', String(retrySec));
      res.status(429).json({
        success: false,
        message: `Too many attempts. Locked for ${retrySec} seconds.`,
      });
      return;
    }

    next();
  };
}

/**
 * Clears the counter for the current request key — call after a SUCCESSFUL auth
 * so legitimate users are never progressively locked out.
 */
export function clearRateLimit(keyPrefix: string, req: Request): void {
  buckets.delete(`${keyPrefix}:${req.ip || 'unknown'}`);
}
