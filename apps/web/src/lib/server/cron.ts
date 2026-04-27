import type { D1Database, KVNamespace, ScheduledEvent } from '@cloudflare/workers-types';
import {
  createDb,
  listTrackedAccounts,
  refreshStaleRankedEntries,
  upsertSnapshot,
} from '@mmr-calculator/db';

interface CronEnv {
  DB: D1Database;
  CACHE: KVNamespace;
}

async function runDailySnapshot(env: CronEnv): Promise<void> {
  const db = createDb(env.DB);
  const tracked = await listTrackedAccounts(db, 500);
  const today = new Date().toISOString().slice(0, 10);

  for (const account of tracked) {
    for (const queue of ['solo', 'flex'] as const) {
      const cacheKey = `estimate:${account.puuid}:${queue}`;
      const cached = await env.CACHE.get(cacheKey);
      if (!cached) continue;

      try {
        const estimate = JSON.parse(cached);
        if (!estimate.mmr || !estimate.rank) continue;

        await upsertSnapshot(db, {
          puuid: account.puuid,
          queue: queue === 'solo' ? 'RANKED_SOLO_5x5' : 'RANKED_FLEX_SR',
          day: today,
          mmrMu: estimate.mmr.mu,
          mmrSigma: estimate.mmr.sigma,
          tier: estimate.rank.tier,
          division: estimate.rank.division,
          lp: estimate.rank.lp,
        });
      } catch {
        // Non-fatal: skip this account
      }
    }
  }
}

async function runRankedRefresh(env: CronEnv): Promise<void> {
  const db = createDb(env.DB);
  await refreshStaleRankedEntries(db, 20 * 3600 * 1000);
}

export async function handleScheduled(event: ScheduledEvent, env: CronEnv): Promise<void> {
  const cron = event.cron;
  if (cron === '30 0 * * *') {
    await runDailySnapshot(env);
  } else if (cron === '0 */6 * * *') {
    await runRankedRefresh(env);
  }
}
