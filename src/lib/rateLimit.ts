import { NextResponse } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory token bucket / sliding window rate limiter
const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  limit: number;       // Maximum requests allowed
  windowMs: number;    // Time window in milliseconds (e.g. 60000 for 1 minute)
  identifier?: string; // Custom key or IP
}

/**
 * Checks if a request exceeds rate limits.
 * @returns { success: true } or { success: false, retryAfterSeconds, errorResponse }
 */
export function checkRateLimit(
  req: Request,
  options: { limit: number; windowMs: number; keyPrefix?: string }
): {
  success: boolean;
  remaining: number;
  resetTime: number;
  errorResponse?: NextResponse;
} {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const key = `${options.keyPrefix || "rl"}:${ip}`;
    const now = Date.now();
    const windowStart = now - options.windowMs;

    let record = rateLimitStore.get(key);
    if (!record) {
      record = { timestamps: [] };
      rateLimitStore.set(key, record);
    }

    // Retain timestamps within the window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= options.limit) {
      const oldestTimestamp = record.timestamps[0];
      const resetTime = oldestTimestamp + options.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

      return {
        success: false,
        remaining: 0,
        resetTime,
        errorResponse: NextResponse.json(
          {
            error: "Too many requests. Please slow down and try again shortly.",
            code: "RATE_LIMIT_EXCEEDED",
            retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSeconds),
              "X-RateLimit-Limit": String(options.limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(resetTime / 1000)),
            },
          }
        ),
      };
    }

    // Register this request
    record.timestamps.push(now);
    const remaining = options.limit - record.timestamps.length;

    return {
      success: true,
      remaining,
      resetTime: now + options.windowMs,
    };
  } catch (err) {
    console.error("Rate limit check error:", err);
    return { success: true, remaining: 1, resetTime: Date.now() + options.windowMs };
  }
}
