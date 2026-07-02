import type { CorsOptions } from "cors";
import type { NextFunction, Request, Response } from "express";
import { logger } from "./logger";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://sigil.s3ntrylabs.com",
  "https://www.sigil.s3ntrylabs.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

type RateBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateBucket>();

function parseCsv(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isExtensionOrigin(origin: string): boolean {
  return /^chrome-extension:\/\/[a-p]{32}$/i.test(origin);
}

function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function isRateLimitExempt(req: Request): boolean {
  return req.method === "OPTIONS" || req.path === "/api/healthz" || req.path === "/api/readyz";
}

function pruneExpiredBuckets(now: number): void {
  if (buckets.size < 10_000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function createCorsOptions(): CorsOptions {
  const allowedOrigins = new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...parseCsv(process.env.SIGIL_ALLOWED_ORIGINS),
    ...parseCsv(process.env.CORS_ALLOWED_ORIGINS),
  ]);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || isExtensionOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by Sigil CORS policy"));
    },
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  };
}

export function createRateLimit() {
  const windowMs = Number(process.env.SIGIL_RATE_LIMIT_WINDOW_MS || 60_000);
  const maxRequests = Number(process.env.SIGIL_RATE_LIMIT_MAX || 60);

  return function sigilRateLimit(req: Request, res: Response, next: NextFunction) {
    if (isRateLimitExempt(req)) {
      next();
      return;
    }

    const now = Date.now();
    pruneExpiredBuckets(now);

    const key = clientKey(req);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;
    if (current.count <= maxRequests) {
      next();
      return;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    logger.warn({ key, path: req.path, retryAfterSeconds }, "Sigil API rate limit exceeded");
    res.status(429).json({
      error: "rate_limited",
      message: "Too many requests. Please wait before trying again.",
      retryAfterSeconds,
    });
  };
}
