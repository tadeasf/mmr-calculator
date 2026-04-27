import { type Queue, computeEstimate } from '$lib/server/estimate';
import { createDb } from '@mmr-calculator/db';
import type { Region } from '@mmr-calculator/riot-client';
import { type RequestHandler, error, json } from '@sveltejs/kit';
import { z } from 'zod';

const COMPUTING_TTL_SEC = 30;

const QuerySchema = z.object({
  riotId: z.string().min(1).max(50),
  tag: z.string().min(1).max(10),
  region: z.enum(['na', 'euw', 'eune', 'kr', 'br', 'jp', 'oce', 'ru', 'tr', 'lan', 'las']),
  queue: z.enum(['solo', 'flex']).default('solo'),
  fresh: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

export const GET: RequestHandler = async ({ url, platform }) => {
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    throw error(400, parsed.error.flatten().fieldErrors as unknown as string);
  }

  const { riotId, tag, region, queue, fresh } = parsed.data;
  const env = platform?.env;
  if (!env?.RIOT_API_KEY) throw error(503, 'Riot API key not configured');

  const db = createDb(env.DB);
  const kv = env.CACHE;
  const puuidCacheKey = `puuid:${region}:${riotId.toLowerCase()}:${tag.toLowerCase()}`;

  // L1: KV estimate cache (skip if fresh=true)
  if (!fresh) {
    const kvPuuid = await kv.get(puuidCacheKey);
    if (kvPuuid) {
      const cacheKey = `estimate:${kvPuuid}:${queue}`;
      const cached = await kv.get(cacheKey);
      if (cached) {
        return json(JSON.parse(cached), {
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
            'X-Cache': 'HIT',
          },
        });
      }
    }
  }

  // Stampede protection: check if another request is already computing
  const puuid = await kv.get(puuidCacheKey);
  if (puuid) {
    const computingKey = `computing:${puuid}:${queue}`;
    const isComputing = await kv.get(computingKey);

    if (isComputing && !fresh) {
      // Another request is in-flight — return stale D1 data if available
      const { findEstimate } = await import('@mmr-calculator/db');
      const stale = await findEstimate(
        db,
        puuid,
        queue === 'solo' ? 'RANKED_SOLO_5x5' : 'RANKED_FLEX_SR',
      );
      if (stale) {
        const result = JSON.parse(stale.data.resultJson);
        result.mmr = { ...result.mmr, refreshing: true };
        return json(result, {
          headers: {
            'Cache-Control': 'public, max-age=60',
            'X-Cache': 'STALE',
          },
        });
      }
    }

    if (puuid) {
      await kv.put(`computing:${puuid}:${queue}`, '1', { expirationTtl: COMPUTING_TTL_SEC });
    }
  }

  // Compute fresh estimate
  try {
    const result = await computeEstimate({
      db,
      kv,
      rateLimiterNs: env.RATE_LIMITER,
      apiKey: env.RIOT_API_KEY,
      riotId,
      tag,
      region: region as Region,
      queue: queue as Queue,
    });

    // Cache the PUUID for future stampede checks
    if ('summoner' in result) {
      await kv.put(puuidCacheKey, result.summoner.puuid, { expirationTtl: 86_400 });
      // Clear computing flag
      await kv.delete(`computing:${result.summoner.puuid}:${queue}`);
    }

    if ('unranked' in result) {
      return json(
        { unranked: true, summoner: result.summoner, message: 'This account has no ranked data.' },
        { headers: { 'Cache-Control': 'public, max-age=300' } },
      );
    }

    return json(result, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'X-Cache': 'MISS',
      },
    });
  } catch (err) {
    // Clear computing flag on error so the next request can retry
    if (puuid) await kv.delete(`computing:${puuid}:${queue}`);
    throw err;
  }
};
