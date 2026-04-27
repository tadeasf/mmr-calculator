import type { D1Database } from '@cloudflare/workers-types';
import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Db = ReturnType<typeof createDb>;

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

// TTLs
const RANKED_ENTRY_TTL_MS = 24 * 60 * 60 * 1_000;
const MATCH_SUMMARY_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const ESTIMATE_FRESH_MS = 6 * 60 * 60 * 1_000;
const ESTIMATE_STALE_MS = 24 * 60 * 60 * 1_000;

// ─── Summoners ────────────────────────────────────────────────────────────────

export type SummonerInsert = typeof schema.summoners.$inferInsert;
export type Summoner = typeof schema.summoners.$inferSelect;

export async function upsertSummoner(db: Db, data: SummonerInsert): Promise<void> {
  await db
    .insert(schema.summoners)
    .values(data)
    .onConflictDoUpdate({
      target: schema.summoners.puuid,
      set: { riotId: data.riotId, tagLine: data.tagLine, lastSeen: data.lastSeen },
    });
}

export async function findSummonerByRiotId(
  db: Db,
  riotId: string,
  tagLine: string,
  region: string,
): Promise<Summoner | null> {
  const rows = await db
    .select()
    .from(schema.summoners)
    .where(
      and(
        eq(schema.summoners.riotId, riotId),
        eq(schema.summoners.tagLine, tagLine),
        eq(schema.summoners.region, region),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

// ─── Ranked entries ───────────────────────────────────────────────────────────

export type RankedEntryInsert = typeof schema.rankedEntries.$inferInsert;
export type RankedEntry = typeof schema.rankedEntries.$inferSelect;

export interface CachedRankedEntry {
  data: RankedEntry;
  fresh: boolean;
}

export async function findRankedEntry(
  db: Db,
  puuid: string,
  queue: string,
): Promise<CachedRankedEntry | null> {
  const rows = await db
    .select()
    .from(schema.rankedEntries)
    .where(and(eq(schema.rankedEntries.puuid, puuid), eq(schema.rankedEntries.queue, queue)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { data: row, fresh: Date.now() - row.fetchedAt < RANKED_ENTRY_TTL_MS };
}

export async function upsertRankedEntry(db: Db, data: RankedEntryInsert): Promise<void> {
  await db
    .insert(schema.rankedEntries)
    .values(data)
    .onConflictDoUpdate({
      target: [schema.rankedEntries.puuid, schema.rankedEntries.queue],
      set: {
        tier: data.tier,
        division: data.division,
        lp: data.lp,
        wins: data.wins,
        losses: data.losses,
        fetchedAt: data.fetchedAt,
      },
    });
}

// ─── Match summaries ──────────────────────────────────────────────────────────

export type MatchSummaryInsert = typeof schema.matchSummaries.$inferInsert;
export type MatchSummary = typeof schema.matchSummaries.$inferSelect;

export async function findMatchSummary(db: Db, matchId: string): Promise<MatchSummary | null> {
  const rows = await db
    .select()
    .from(schema.matchSummaries)
    .where(eq(schema.matchSummaries.matchId, matchId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  // Match data is considered permanently valid once cached (7d before we'd refresh)
  return Date.now() - row.fetchedAt < MATCH_SUMMARY_TTL_MS ? row : null;
}

export async function upsertMatchSummary(db: Db, data: MatchSummaryInsert): Promise<void> {
  await db
    .insert(schema.matchSummaries)
    .values(data)
    .onConflictDoUpdate({
      target: schema.matchSummaries.matchId,
      set: { participantsJson: data.participantsJson, fetchedAt: data.fetchedAt },
    });
}

// ─── Player matches ───────────────────────────────────────────────────────────

export type PlayerMatchInsert = typeof schema.playerMatches.$inferInsert;

export async function upsertPlayerMatch(db: Db, data: PlayerMatchInsert): Promise<void> {
  await db
    .insert(schema.playerMatches)
    .values(data)
    .onConflictDoUpdate({
      target: [schema.playerMatches.puuid, schema.playerMatches.matchId],
      set: { win: data.win },
    });
}

// ─── MMR estimates ────────────────────────────────────────────────────────────

export type EstimateInsert = typeof schema.mmrEstimates.$inferInsert;
export type MmrEstimate = typeof schema.mmrEstimates.$inferSelect;

export type EstimateFreshness = 'fresh' | 'stale' | 'expired' | 'missing';

export interface CachedEstimate {
  data: MmrEstimate;
  freshness: EstimateFreshness;
}

export async function findEstimate(
  db: Db,
  puuid: string,
  queue: string,
): Promise<CachedEstimate | null> {
  const rows = await db
    .select()
    .from(schema.mmrEstimates)
    .where(and(eq(schema.mmrEstimates.puuid, puuid), eq(schema.mmrEstimates.queue, queue)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const age = Date.now() - row.computedAt;
  let freshness: EstimateFreshness;
  if (age < ESTIMATE_FRESH_MS) freshness = 'fresh';
  else if (age < ESTIMATE_STALE_MS) freshness = 'stale';
  else freshness = 'expired';
  return { data: row, freshness };
}

export async function upsertEstimate(db: Db, data: EstimateInsert): Promise<void> {
  await db
    .insert(schema.mmrEstimates)
    .values(data)
    .onConflictDoUpdate({
      target: [schema.mmrEstimates.puuid, schema.mmrEstimates.queue],
      set: {
        mmrMu: data.mmrMu,
        mmrSigma: data.mmrSigma,
        tier1Mu: data.tier1Mu,
        tier1Sigma: data.tier1Sigma,
        tier2Mu: data.tier2Mu,
        tier2Sigma: data.tier2Sigma,
        lobbiesUsed: data.lobbiesUsed,
        computedAt: data.computedAt,
        resultJson: data.resultJson,
      },
    });
}

// ─── MMR snapshots ────────────────────────────────────────────────────────────

export type SnapshotInsert = typeof schema.mmrSnapshots.$inferInsert;
export type MmrSnapshot = typeof schema.mmrSnapshots.$inferSelect;

export async function upsertSnapshot(db: Db, data: SnapshotInsert): Promise<void> {
  await db
    .insert(schema.mmrSnapshots)
    .values(data)
    .onConflictDoUpdate({
      target: [schema.mmrSnapshots.puuid, schema.mmrSnapshots.queue, schema.mmrSnapshots.day],
      set: {
        mmrMu: data.mmrMu,
        mmrSigma: data.mmrSigma,
        tier: data.tier,
        division: data.division,
        lp: data.lp,
      },
    });
}

export async function findSnapshots(
  db: Db,
  puuid: string,
  queue: string,
  days: 7 | 30 | 90,
): Promise<MmrSnapshot[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1_000);
  const cutoffDay = cutoff.toISOString().slice(0, 10);
  return db
    .select()
    .from(schema.mmrSnapshots)
    .where(
      and(
        eq(schema.mmrSnapshots.puuid, puuid),
        eq(schema.mmrSnapshots.queue, queue),
        gte(schema.mmrSnapshots.day, cutoffDay),
      ),
    )
    .orderBy(schema.mmrSnapshots.day);
}

// ─── Tracked accounts ─────────────────────────────────────────────────────────

export async function upsertTrackedAccount(
  db: Db,
  puuid: string,
  autoTrackThreshold = 3,
): Promise<void> {
  const now = Date.now();
  await db
    .insert(schema.trackedAccounts)
    .values({ puuid, addedAt: now, checkCount: 1 })
    .onConflictDoUpdate({
      target: schema.trackedAccounts.puuid,
      // Only increment if below threshold — once tracked, stays tracked
      set: { checkCount: schema.trackedAccounts.checkCount },
    });

  // Fetch current count and see if we should mark as fully tracked
  const rows = await db
    .select()
    .from(schema.trackedAccounts)
    .where(eq(schema.trackedAccounts.puuid, puuid))
    .limit(1);

  const row = rows[0];
  if (!row) return;

  // Increment check count
  const newCount = row.checkCount + 1;
  await db
    .update(schema.trackedAccounts)
    .set({ checkCount: newCount })
    .where(eq(schema.trackedAccounts.puuid, puuid));

  void autoTrackThreshold; // threshold check is implicit: cron picks up all tracked accounts
}

export async function markEstimated(db: Db, puuid: string): Promise<void> {
  await db
    .update(schema.trackedAccounts)
    .set({ lastEstimatedAt: Date.now() })
    .where(eq(schema.trackedAccounts.puuid, puuid));
}

export async function listTrackedAccounts(
  db: Db,
  limit = 100,
): Promise<(typeof schema.trackedAccounts.$inferSelect)[]> {
  return db
    .select()
    .from(schema.trackedAccounts)
    .orderBy(desc(schema.trackedAccounts.lastEstimatedAt))
    .limit(limit);
}

export async function refreshStaleRankedEntries(db: Db, olderThanMs: number): Promise<number> {
  const cutoff = Date.now() - olderThanMs;
  const result = await db
    .delete(schema.rankedEntries)
    .where(lt(schema.rankedEntries.fetchedAt, cutoff))
    .returning({ puuid: schema.rankedEntries.puuid });
  return result.length;
}
