import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context, MiddlewareHandler } from "hono";
import type { ServerConfig } from "./config.js";

type Bucket = "create" | "api";

interface WindowEntry {
  count: number;
  windowStart: number;
}

type CheckResult = { allowed: true } | { allowed: false; retryAfterSec: number };

const WINDOW_MS = 60_000;

export class RateLimiter {
  private readonly createLimit: number;
  private readonly apiLimit: number;
  private readonly createBuckets = new Map<string, WindowEntry>();
  private readonly apiBuckets = new Map<string, WindowEntry>();
  private readonly pruner: NodeJS.Timeout;

  constructor(config: Pick<ServerConfig, "rateLimitCreatePerMinute" | "rateLimitApiPerMinute">) {
    this.createLimit = config.rateLimitCreatePerMinute;
    this.apiLimit = config.rateLimitApiPerMinute;
    this.pruner = setInterval(() => this.prune(), WINDOW_MS);
    this.pruner.unref();
  }

  check(bucket: Bucket, key: string): CheckResult {
    const limit = bucket === "create" ? this.createLimit : this.apiLimit;
    if (limit === 0) {
      return { allowed: true };
    }

    const buckets = bucket === "create" ? this.createBuckets : this.apiBuckets;
    const now = Date.now();
    const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
    const windowEnd = windowStart + WINDOW_MS;

    let entry = buckets.get(key);
    if (!entry || entry.windowStart !== windowStart) {
      entry = { count: 0, windowStart };
      buckets.set(key, entry);
    }

    if (entry.count >= limit) {
      const retryAfterSec = Math.max(1, Math.ceil((windowEnd - now) / 1000));
      return { allowed: false, retryAfterSec };
    }

    entry.count++;
    return { allowed: true };
  }

  stop(): void {
    clearInterval(this.pruner);
    this.createBuckets.clear();
    this.apiBuckets.clear();
  }

  private prune(): void {
    const cutoff = Date.now() - WINDOW_MS * 2;
    for (const [key, entry] of this.createBuckets) {
      if (entry.windowStart < cutoff) {
        this.createBuckets.delete(key);
      }
    }
    for (const [key, entry] of this.apiBuckets) {
      if (entry.windowStart < cutoff) {
        this.apiBuckets.delete(key);
      }
    }
  }
}

export function resolveClientIp(c: Context): string {
  const flyClientIp = c.req.header("Fly-Client-IP");
  if (flyClientIp) {
    return flyClientIp.trim();
  }

  const forwardedFor = c.req.header("X-Forwarded-For");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  try {
    const address = getConnInfo(c).remote.address;
    if (address) {
      return address;
    }
  } catch {
    // fall through to unknown
  }

  return "unknown";
}

function rateLimitedResponse(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests, try again later",
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}

export function rateLimitMiddleware(limiter: RateLimiter): MiddlewareHandler {
  return async (c, next) => {
    const ip = resolveClientIp(c);

    const apiResult = limiter.check("api", ip);
    if (!apiResult.allowed) {
      console.error(`[http] rate limited ip=${ip} bucket=api`);
      return rateLimitedResponse(apiResult.retryAfterSec);
    }

    if (c.req.method === "POST" && c.req.path === "/v1/inboxes") {
      const createResult = limiter.check("create", ip);
      if (!createResult.allowed) {
        console.error(`[http] rate limited ip=${ip} bucket=create`);
        return rateLimitedResponse(createResult.retryAfterSec);
      }
    }

    await next();
  };
}
