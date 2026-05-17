/**
 * Simple in-memory rate limiter
 * For production with multiple instances, use Redis (Upstash) instead
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetAt < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  limit: number;
  /**
   * Time window in milliseconds
   */
  window: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - Unique identifier for the rate limit (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 * 
 * @example
 * ```ts
 * const result = rateLimit('user-123', { limit: 10, window: 60000 });
 * if (!result.success) {
 *   return NextResponse.json(
 *     { error: 'Too many requests' },
 *     { 
 *       status: 429,
 *       headers: {
 *         'X-RateLimit-Limit': result.limit.toString(),
 *         'X-RateLimit-Remaining': result.remaining.toString(),
 *         'X-RateLimit-Reset': result.reset.toString(),
 *       }
 *     }
 *   );
 * }
 * ```
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = `${identifier}:${config.window}`;

  // Get or create entry
  let entry = store[key];
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.window,
    };
    store[key] = entry;
  }

  // Increment count
  entry.count++;

  const remaining = Math.max(0, config.limit - entry.count);
  const success = entry.count <= config.limit;

  return {
    success,
    limit: config.limit,
    remaining,
    reset: entry.resetAt,
  };
}

/**
 * Common rate limit configurations
 */
export const RateLimits = {
  /**
   * Strict rate limit for sensitive operations (e.g., login, password reset)
   * 5 requests per 15 minutes
   */
  STRICT: { limit: 5, window: 15 * 60 * 1000 },

  /**
   * Standard rate limit for API endpoints
   * 100 requests per minute
   */
  STANDARD: { limit: 100, window: 60 * 1000 },

  /**
   * Generous rate limit for read operations
   * 1000 requests per minute
   */
  GENEROUS: { limit: 1000, window: 60 * 1000 },

  /**
   * Rate limit for file uploads
   * 10 uploads per hour
   */
  UPLOAD: { limit: 10, window: 60 * 60 * 1000 },
};

/**
 * Get rate limit identifier from request
 * Uses user ID if authenticated, otherwise IP address
 */
export function getRateLimitIdentifier(
  userId: string | null,
  ip: string | null
): string {
  return userId || ip || "anonymous";
}
