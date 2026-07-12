import { NextResponse } from "next/server";

// Simple in-memory rate limiter with sliding window
// For production at scale, replace with Redis (Upstash, Vercel KV, etc.)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60 * 1000
): { success: boolean; limit: number; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    // New window
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    store.set(identifier, newEntry);
    return { success: true, limit, remaining: limit - 1, resetAt: newEntry.resetAt };
  }

  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, limit, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function rateLimitResponse(
  request: Request,
  limit: number = 60,
  windowMs: number = 60 * 1000
): { success: boolean; response?: NextResponse } {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const path = new URL(request.url).pathname;
  const key = `${ip}:${path}`;

  const result = rateLimit(key, limit, windowMs);

  if (!result.success) {
    const response = NextResponse.json(
      { error: "Rate limit exceeded. Please slow down." },
      { status: 429 }
    );
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
    return { success: false, response };
  }

  return { success: true };
}
