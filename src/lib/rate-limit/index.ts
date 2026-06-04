import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RateLimitError } from "@/lib/api-errors";

// ── Redis Client ──────────────────────────────────────────────────────

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn(
        "[Rate Limit] Upstash Redis not configured. Rate limiting disabled."
      );
      throw new Error("Rate limiting not configured");
    }

    redis = new Redis({
      url,
      token,
    });
  }

  return redis;
}

// ── Rate Limiters ─────────────────────────────────────────────────────

const limiters = new Map<string, Ratelimit>();

function getRateLimiter(
  key: string,
  tokens: number,
  window: string
): Ratelimit {
  const limiterKey = `${key}-${tokens}-${window}`;

  if (!limiters.has(limiterKey)) {
    try {
      const redis = getRedis();
      limiters.set(
        limiterKey,
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(tokens, window as any),
          prefix: `ratelimit:${key}`,
          analytics: true,
        })
      );
    } catch (error) {
      // Rate limiting not configured - allow all requests
      console.warn(`[Rate Limit] ${error}`);
      return {
        limit: async () => ({ success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve() }),
      } as unknown as Ratelimit;
    }
  }

  return limiters.get(limiterKey)!;
}

// ── Rate Limit Check ──────────────────────────────────────────────────

export async function checkRateLimit(
  identifier: string,
  limitKey: string,
  tokens: number,
  window: string
): Promise<void> {
  const limiter = getRateLimiter(limitKey, tokens, window);
  const result = await limiter.limit(identifier);

  if (!result.success) {
    const resetDate = new Date(result.reset);
    const secondsUntilReset = Math.ceil(
      (resetDate.getTime() - Date.now()) / 1000
    );

    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${secondsUntilReset} seconds.`
    );
  }
}

// ── Predefined Rate Limiters ──────────────────────────────────────────

/**
 * General API rate limit: 100 requests per minute
 */
export async function generalRateLimit(identifier: string): Promise<void> {
  await checkRateLimit(identifier, "general", 100, "1 m");
}

/**
 * Authentication rate limit: 5 requests per minute
 */
export async function authRateLimit(identifier: string): Promise<void> {
  await checkRateLimit(identifier, "auth", 5, "1 m");
}

/**
 * Upload rate limit: 10 requests per hour
 */
export async function uploadRateLimit(identifier: string): Promise<void> {
  await checkRateLimit(identifier, "upload", 10, "1 h");
}

/**
 * Message rate limit: 50 requests per minute
 */
export async function messageRateLimit(identifier: string): Promise<void> {
  await checkRateLimit(identifier, "message", 50, "1 m");
}

/**
 * Search rate limit: 30 requests per minute
 */
export async function searchRateLimit(identifier: string): Promise<void> {
  await checkRateLimit(identifier, "search", 30, "1 m");
}

/**
 * Create resource rate limit: 20 requests per hour
 */
export async function createRateLimit(identifier: string): Promise<void> {
  await checkRateLimit(identifier, "create", 20, "1 h");
}

/**
 * Update resource rate limit: 50 requests per hour
 */
export async function updateRateLimit(identifier: string): Promise<void> {
  await checkRateLimit(identifier, "update", 50, "1 h");
}

// ── IP-Based Rate Limiting ────────────────────────────────────────────

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

/**
 * Rate limit by IP address for unauthenticated requests
 */
export async function ipRateLimit(
  req: Request,
  tokens: number = 100,
  window: string = "1 m"
): Promise<void> {
  const ip = getClientIp(req);
  await checkRateLimit(ip, "ip", tokens, window);
}
