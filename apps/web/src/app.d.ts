import type { D1Database, DurableObjectNamespace, KVNamespace } from '@cloudflare/workers-types';

declare global {
  namespace App {
    interface Platform {
      env: {
        DB: D1Database;
        CACHE: KVNamespace;
        RATE_LIMITER: DurableObjectNamespace;
        RIOT_API_KEY: string;
      };
      context: {
        waitUntil(promise: Promise<unknown>): void;
      };
      caches: CacheStorage & { default: Cache };
    }
  }
}
