import type { D1Database, DurableObjectNamespace, KVNamespace } from '@cloudflare/workers-types';
import { RateLimiterClient } from '@mmr-calculator/riot-client';
import { type RequestHandler, json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ platform }) => {
  const env = platform?.env;

  const [dbOk, kvOk, rateUsage] = await Promise.all([
    checkD1(env?.DB),
    checkKv(env?.CACHE),
    getRateUsage(env?.RATE_LIMITER),
  ]);

  const healthy = dbOk && kvOk;

  return json(
    {
      status: healthy ? 'healthy' : 'degraded',
      db: dbOk ? 'ok' : 'error',
      kv: kvOk ? 'ok' : 'unavailable',
      rateLimit: rateUsage ?? { unavailable: true },
      ts: Date.now(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
};

async function checkD1(db: D1Database | undefined): Promise<boolean> {
  if (!db) return false;
  try {
    await db.prepare('SELECT 1').run();
    return true;
  } catch {
    return false;
  }
}

function checkKv(kv: KVNamespace | undefined): boolean {
  return kv !== undefined;
}

async function getRateUsage(ns: DurableObjectNamespace | undefined) {
  if (!ns) return null;
  try {
    const client = new RateLimiterClient(ns);
    return await client.getUsage();
  } catch {
    return null;
  }
}
