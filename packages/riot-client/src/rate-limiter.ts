// Durable Object that enforces Riot dev-key limits:
//   20 req / 1 s  (short window)
//   100 req / 2 min  (long window)
//
// Export note: RateLimiterDO must appear as a named export from the deployed
// Worker entry point. The post-build script in apps/web/scripts/inject-do.mjs
// appends it to the generated _worker.js. In development (vite dev) the DO is
// unavailable; the RiotClient skips rate limiting gracefully.

import type {
  DurableObjectNamespace,
  DurableObjectState,
  DurableObjectStub,
} from '@cloudflare/workers-types';

export const SHORT_LIMIT = 20;
export const SHORT_WINDOW_MS = 1_000;
export const LONG_LIMIT = 100;
export const LONG_WINDOW_MS = 120_000;

export interface RateLimitWindow {
  count: number;
  windowStart: number;
}

export interface UsageStats {
  short: {
    used: number;
    limit: number;
    windowMs: number;
    resetsInMs: number;
    pct: number;
  };
  long: {
    used: number;
    limit: number;
    windowMs: number;
    resetsInMs: number;
    pct: number;
  };
}

export interface AcquireResult {
  ok: boolean;
  retryAfterMs?: number;
}

export class RateLimiterDO {
  private short: RateLimitWindow = { count: 0, windowStart: 0 };
  private long: RateLimitWindow = { count: 0, windowStart: 0 };

  constructor(private readonly state: DurableObjectState) {
    state.blockConcurrencyWhile(async () => {
      const stored = await state.storage.get<{ short: RateLimitWindow; long: RateLimitWindow }>(
        'windows',
      );
      if (stored) {
        this.short = stored.short;
        this.long = stored.long;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    const now = Date.now();
    if (path === '/acquire') return this.acquire(now);
    if (path === '/usage') return Response.json(this.buildUsage(now));
    return new Response('not found', { status: 404 });
  }

  private async acquire(now: number): Promise<Response> {
    this.tick(now);

    const shortFull = this.short.count >= SHORT_LIMIT;
    const longFull = this.long.count >= LONG_LIMIT;

    if (shortFull || longFull) {
      const retryAfterMs = shortFull
        ? this.short.windowStart + SHORT_WINDOW_MS - now
        : this.long.windowStart + LONG_WINDOW_MS - now;
      return Response.json({ ok: false, retryAfterMs: Math.max(1, retryAfterMs) });
    }

    this.short.count++;
    this.long.count++;
    await this.state.storage.put('windows', { short: this.short, long: this.long });
    return Response.json({ ok: true });
  }

  private tick(now: number): void {
    if (now >= this.short.windowStart + SHORT_WINDOW_MS)
      this.short = { count: 0, windowStart: now };
    if (now >= this.long.windowStart + LONG_WINDOW_MS) this.long = { count: 0, windowStart: now };
  }

  private buildUsage(now: number): UsageStats {
    this.tick(now);
    return {
      short: {
        used: this.short.count,
        limit: SHORT_LIMIT,
        windowMs: SHORT_WINDOW_MS,
        resetsInMs: Math.max(0, this.short.windowStart + SHORT_WINDOW_MS - now),
        pct: Math.round((this.short.count / SHORT_LIMIT) * 100),
      },
      long: {
        used: this.long.count,
        limit: LONG_LIMIT,
        windowMs: LONG_WINDOW_MS,
        resetsInMs: Math.max(0, this.long.windowStart + LONG_WINDOW_MS - now),
        pct: Math.round((this.long.count / LONG_LIMIT) * 100),
      },
    };
  }
}

// Client helper: call the pinned global DO from Worker request handlers
export class RateLimiterClient {
  private stub: DurableObjectStub;

  constructor(namespace: DurableObjectNamespace) {
    this.stub = namespace.get(namespace.idFromName('global'));
  }

  async acquire(): Promise<AcquireResult> {
    const res = await this.stub.fetch('https://rate-limiter/acquire');
    return res.json<AcquireResult>();
  }

  async getUsage(): Promise<UsageStats> {
    const res = await this.stub.fetch('https://rate-limiter/usage');
    return res.json<UsageStats>();
  }
}
