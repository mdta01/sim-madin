/**
 * ============================================================================
 * In-memory rate limiter — simple sliding-window counter per IP+route
 * ============================================================================
 * Why not Upstash/Redis?
 *   - MVP doesn't need distributed rate limiting (single Vercel instance)
 *   - For serverless cold-start edge cases, per-instance limit is acceptable
 *   - Easy to migrate to Upstash later (just swap `hit()` implementation)
 *
 * Limitations:
 *   - State resets when function instance restarts (acceptable for login)
 *   - Per-instance, not per-cluster — fine for Vercel hobby plan
 *
 * Strategy: token bucket with refilling (1 token per `refillMs`).
 * Each IP+key gets `capacity` tokens; each request consumes 1.
 * ============================================================================
 */

interface Bucket {
  tokens: number
  lastRefill: number
}

interface RateLimitConfig {
  /** Maximum tokens (requests) allowed in burst */
  capacity: number
  /** Time to refill 1 token, in milliseconds */
  refillMs: number
}

const buckets = new Map<string, Bucket>()

// Garbage-collect stale buckets every 5 minutes to prevent memory leak
const GC_INTERVAL_MS = 5 * 60 * 1000
const STALE_AFTER_MS = 30 * 60 * 1000 // remove buckets idle for 30 min
let lastGC = Date.now()

function gcStaleBuckets(now: number): void {
  if (now - lastGC < GC_INTERVAL_MS) return
  lastGC = now
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > STALE_AFTER_MS) {
      buckets.delete(key)
    }
  }
}

export interface RateLimitResult {
  /** Whether the request is allowed (true) or rate-limited (false) */
  allowed: boolean
  /** Remaining tokens in the bucket (after this request) */
  remaining: number
  /** When the bucket will refill to capacity (epoch ms) */
  resetAt: number
  /** Total limit (for X-RateLimit-Limit header) */
  limit: number
}

/**
 * Check whether a request from `identifier` to `key` (e.g. "/api/wali/login")
 * is allowed under the configured rate limit.
 *
 * @param identifier  Unique per-user/per-IP key (e.g. IP address)
 * @param key          Route or action identifier (e.g. "/api/wali/login")
 * @param config       Capacity + refill config
 * @returns            RateLimitResult — call `allowed` to decide whether
 *                    to proceed or return 429.
 *
 * @example
 *   const rl = rateLimit(ip, "/api/wali/login", { capacity: 5, refillMs: 60_000 })
 *   if (!rl.allowed) {
 *     return NextResponse.json({ error: "Too many attempts" }, {
 *       status: 429,
 *       headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now())/1000)) }
 *     })
 *   }
 */
export function rateLimit(
  identifier: string,
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now()
  gcStaleBuckets(now)

  const bucketKey = `${identifier}::${key}`
  let bucket = buckets.get(bucketKey)

  if (!bucket) {
    // First request — start at full capacity
    bucket = { tokens: config.capacity - 1, lastRefill: now }
    buckets.set(bucketKey, bucket)
    return {
      allowed: true,
      remaining: bucket.tokens,
      resetAt: now + config.refillMs * config.capacity,
      limit: config.capacity,
    }
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill
  const refilled = Math.floor(elapsed / config.refillMs)
  if (refilled > 0) {
    bucket.tokens = Math.min(config.capacity, bucket.tokens + refilled)
    bucket.lastRefill = now
  }

  if (bucket.tokens <= 0) {
    // Rate-limited — calculate when the next token will be available
    const msUntilNext = config.refillMs - (elapsed % config.refillMs)
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + msUntilNext,
      limit: config.capacity,
    }
  }

  // Consume 1 token
  bucket.tokens -= 1
  return {
    allowed: true,
    remaining: bucket.tokens,
    resetAt: now + config.refillMs * (config.capacity - bucket.tokens),
    limit: config.capacity,
  }
}

/**
 * Get client IP from Next.js request — handles Vercel proxy headers.
 * Returns "unknown" if no IP can be determined (in which case rate limit
 * becomes per-route, not per-IP — degrade gracefully).
 */
export function getClientIP(req: Request): string {
  const headers = new Headers(req.headers)
  // Vercel sets x-vercel-forwarded-for, x-real-ip, x-forwarded-for in order
  const xff = headers.get("x-vercel-forwarded-for") || headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  const realIP = headers.get("x-real-ip")
  if (realIP) return realIP.trim()
  return "unknown"
}

/**
 * Apply rate-limit headers to a NextResponse.
 * Use when a request is rate-limited (429 response).
 */
export function rateLimitHeaders(rl: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(Math.floor(rl.resetAt / 1000)),
    "Retry-After": String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
  }
}

/**
 * Pre-configured rate-limit presets for sensitive endpoints.
 * All capacities are per-IP.
 */
export const RATE_LIMITS = {
  /** Login: 5 attempts per minute per IP — block brute-force */
  login: { capacity: 5, refillMs: 60_000 },
  /** OTP request: 3 per 5 minutes per IP — block OTP spam */
  otp: { capacity: 3, refillMs: 300_000 },
  /** Password reset: 3 per hour per IP — very strict */
  passwordReset: { capacity: 3, refillMs: 3_600_000 },
  /** Generic API: 60 per minute — protect against scraping */
  api: { capacity: 60, refillMs: 60_000 },
} as const
