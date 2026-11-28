export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export function getClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (fwd) return fwd;
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
  nowMs: number = Date.now()
): RateLimitResult {
  const cutoff = nowMs - options.windowMs;
  const existing = buckets.get(key);
  const recent = existing ? existing.timestamps.filter((t) => t > cutoff) : [];

  if (recent.length >= options.limit) {
    const oldest = recent[0] ?? nowMs;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + options.windowMs - nowMs) / 1000));
    buckets.set(key, { timestamps: recent });
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  recent.push(nowMs);
  if (!existing && buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey) buckets.delete(oldestKey);
  }
  buckets.set(key, { timestamps: recent });
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - recent.length),
    retryAfterSec: 0,
  };
}

export function clearRateLimitBucket(key: string): void {
  buckets.delete(key);
}
