import type { DurableObjectNamespace, KVNamespace } from '@cloudflare/workers-types';
import {
  type CombinedEstimate,
  combineEstimates,
  computeLobbyMmr,
  computeTier1,
  computeTier2,
  mmrToRankLabel,
  rankToMmr,
  sigmaToConfidence,
} from '@mmr-calculator/core';
import {
  type Db,
  findMatchSummary,
  findRankedEntry,
  markEstimated,
  upsertEstimate,
  upsertMatchSummary,
  upsertPlayerMatch,
  upsertRankedEntry,
  upsertSummoner,
  upsertTrackedAccount,
} from '@mmr-calculator/db';
import {
  type Match,
  RateLimiterClient,
  type Region,
  RiotClient,
  RiotNotFoundError,
} from '@mmr-calculator/riot-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Queue = 'solo' | 'flex';

export interface LobbyData {
  matchId: string;
  date: string;
  win: boolean;
  daysAgo: number;
  participants: { puuid: string; role: string; mmr: number; isOpponent: boolean }[];
}

export interface ParticipantSummary {
  puuid: string;
  teamId: number;
  role: string;
  win: boolean;
}

export interface LobbyEntry {
  matchId: string;
  date: string;
  win: boolean;
  lobbyMmr: number;
  participants: { puuid: string; role: string; mmr: number; isOpponent: boolean }[];
}

export interface ClimbProjection {
  // Best-estimate ceiling expressed as a rank label (e.g. "Platinum II").
  // Derived from the underlying skill estimate; the raw rating value is never
  // surfaced to the user.
  ceilingLabel: string;
  // The ETA path: each step the user could realistically reach, with games
  // and days estimates assuming current win-rate (with a per-division decay).
  steps: ClimbStep[];
  // LP/game pace summary, derived from public LP gain/loss observations.
  netLpPerGame: number;
  baselineWinrate: number;
  notes: string[];
}

export interface ClimbStep {
  label: string;
  games: number;
  days: number;
  decayedWinrate: number;
  beyondCeiling: boolean;
}

export interface MmrResult {
  summoner: { puuid: string; riotId: string; tag: string; region: string };
  rank: { tier: string; division: string; lp: number; wins: number; losses: number };
  mmr: {
    mu: number;
    ci90: [number, number];
    sigma: number;
    lobbiesUsed: number;
    confidence: 'high' | 'medium' | 'low';
    computedAt: number;
    refreshing?: boolean;
  };
  tier1: { gapMu: number; gapSigma: number; sampleSize: number } | null;
  tier2: { mu: number; sigma: number; lobbies: LobbyEntry[] } | null;
  lpEfficiency: { avgLpGain: number; avgLpLoss: number; breakEvenWinrate: number };
  promoPredictor: {
    nextRankLabel: string;
    gamesEstimate: number;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  smurfFlag: { score: number; reasons: string[] };
  fairnessScore: {
    teamMmrSpread: number;
    enemyMmrSpread: number;
    verdict: 'balanced' | 'unfavorable' | 'favorable';
  };
  climbProjection: ClimbProjection;
}

export interface UnrankedResult {
  unranked: true;
  summoner: { puuid: string; riotId: string; tag: string; region: string };
}

export type EstimateResult = MmrResult | UnrankedResult;

// ─── Constants ────────────────────────────────────────────────────────────────

export const QUEUE_ID: Record<Queue, 420 | 440> = { solo: 420, flex: 440 };
export const QUEUE_TYPE: Record<Queue, string> = {
  solo: 'RANKED_SOLO_5x5',
  flex: 'RANKED_FLEX_SR',
};
export const MAX_GAMES = 20;
export const GAME_WINDOW_MS = 30 * 24 * 60 * 60 * 1_000;
export const MAX_UNRANKED_IN_LOBBY = 2;
export const APEX_TIERS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER']);
// LP-efficiency approximation constants (calibrated for v1)
const LP_BASE = 20;
const LP_MMR_FACTOR = 0.03;

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface EstimateOptions {
  db: Db;
  kv: KVNamespace;
  rateLimiterNs?: DurableObjectNamespace;
  apiKey: string;
  riotId: string;
  tag: string;
  region: Region;
  queue: Queue;
}

export async function computeEstimate(opts: EstimateOptions): Promise<EstimateResult> {
  const { db, kv, apiKey, riotId, tag, region, queue } = opts;

  const rateLimiter = opts.rateLimiterNs ? new RateLimiterClient(opts.rateLimiterNs) : undefined;
  const riot = new RiotClient(apiKey, rateLimiter);

  const puuid = await resolvePuuid(db, riot, riotId, tag, region);
  const rankedEntry = await resolveRankedEntry(db, riot, puuid, region, queue);
  if (!rankedEntry) return { unranked: true, summoner: { puuid, riotId, tag, region } };

  const { lobbies, matchDetails } = await fetchLobbies(db, riot, puuid, region, queue);
  return finalizeEstimate(
    db,
    kv,
    { riotId, tag, region, queue },
    puuid,
    rankedEntry,
    lobbies,
    matchDetails,
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function resolvePuuid(
  db: Db,
  riot: RiotClient,
  riotId: string,
  tag: string,
  region: Region,
): Promise<string> {
  const cached = await import('@mmr-calculator/db').then((m) =>
    m.findSummonerByRiotId(db, riotId, tag, region),
  );
  if (cached) return cached.puuid;

  const account = await riot.getAccountByRiotId(riotId, tag, region);
  await upsertSummoner(db, {
    puuid: account.puuid,
    region,
    riotId: account.gameName,
    tagLine: account.tagLine,
    lastSeen: Date.now(),
  });
  return account.puuid;
}

export async function resolveRankedEntry(
  db: Db,
  riot: RiotClient,
  puuid: string,
  region: Region,
  queue: Queue,
) {
  const queueType = QUEUE_TYPE[queue];
  const cached = await findRankedEntry(db, puuid, queueType);
  if (cached?.fresh) return cached.data;

  const entries = await riot.getLeagueEntries(puuid, region);
  const now = Date.now();

  for (const entry of entries) {
    await upsertRankedEntry(db, {
      puuid,
      queue: entry.queueType,
      tier: entry.tier,
      division: entry.rank,
      lp: entry.leaguePoints,
      wins: entry.wins,
      losses: entry.losses,
      fetchedAt: now,
    });
  }

  const updated = entries.find((e) => e.queueType === queueType);
  if (!updated) return null;

  return {
    puuid,
    queue: updated.queueType,
    tier: updated.tier,
    division: updated.rank,
    lp: updated.leaguePoints,
    wins: updated.wins,
    losses: updated.losses,
    fetchedAt: now,
  };
}

async function fetchLobbies(
  db: Db,
  riot: RiotClient,
  puuid: string,
  region: Region,
  queue: Queue,
): Promise<{ lobbies: LobbyData[]; matchDetails: ParticipantSummary[][] }> {
  const queueId = QUEUE_ID[queue];
  const matchIds = await riot.getMatchIds(puuid, region, queueId, MAX_GAMES);

  const lobbies: LobbyData[] = [];
  const matchDetails: ParticipantSummary[][] = [];

  for (const matchId of matchIds) {
    const out = await processOneMatch(db, riot, puuid, region, queue, matchId);
    if (out.participants) matchDetails.push(out.participants);
    if (out.lobby) lobbies.push(out.lobby);
  }

  return { lobbies, matchDetails };
}

/**
 * Process a single match: ensure summary in DB, look up participant ranks,
 * build a LobbyData if the match qualifies. Used by both the synchronous
 * computeEstimate path and the chunked EstimateJobDO.
 *
 * Subrequest budget: up to 1 (match-v5) + 9 (league-v4 per participant) = 10.
 */
export async function processOneMatch(
  db: Db,
  riot: RiotClient,
  puuid: string,
  region: Region,
  queue: Queue,
  matchId: string,
): Promise<{ lobby: LobbyData | null; participants: ParticipantSummary[] | null }> {
  const queueId = QUEUE_ID[queue];
  const queueType = QUEUE_TYPE[queue];
  const now = Date.now();

  let summary = await findMatchSummary(db, matchId);

  if (!summary) {
    let match: Match | undefined;
    try {
      match = await riot.getMatch(matchId, region);
    } catch (e) {
      if (e instanceof RiotNotFoundError) return { lobby: null, participants: null };
      throw e;
    }
    if (!match) return { lobby: null, participants: null };

    const participants: ParticipantSummary[] = match.info.participants.map((p) => ({
      puuid: p.puuid,
      teamId: p.teamId,
      role: p.teamPosition ?? '',
      win: p.win,
    }));

    const insertData = {
      matchId,
      region,
      queue: queueId,
      startedAt: match.info.gameStartTimestamp,
      duration: match.info.gameDuration,
      participantsJson: JSON.stringify(participants),
      fetchedAt: now,
    };
    await upsertMatchSummary(db, insertData);

    const me = match.info.participants.find((p) => p.puuid === puuid);
    if (me) {
      await upsertPlayerMatch(db, {
        puuid,
        matchId,
        startedAt: match.info.gameStartTimestamp,
        win: me.win ? 1 : 0,
      });
    }

    summary = { ...insertData, matchId };
  }

  const startedAt = summary.startedAt;
  const daysAgo = (now - startedAt) / (24 * 60 * 60 * 1_000);
  const participants = JSON.parse(summary.participantsJson) as ParticipantSummary[];

  if (now - startedAt > GAME_WINDOW_MS) return { lobby: null, participants };

  const me = participants.find((p) => p.puuid === puuid);
  if (!me) return { lobby: null, participants };

  const others = participants.filter((p) => p.puuid !== puuid);
  const ranked = await resolveParticipantRanks(db, riot, others, region, queueType);

  if (ranked.filter((r) => r === null).length > MAX_UNRANKED_IN_LOBBY) {
    return { lobby: null, participants };
  }

  const lobbyParticipants = others
    .map((p, i) => {
      const entry = ranked[i];
      if (!entry) return null;
      return {
        puuid: p.puuid,
        role: p.role,
        mmr: rankToMmr(entry.tier, entry.division, entry.lp),
        isOpponent: p.teamId !== me.teamId,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (lobbyParticipants.length < 7) return { lobby: null, participants };

  const date = new Date(startedAt).toISOString().slice(0, 10);
  return {
    lobby: { matchId, date, win: me.win, daysAgo, participants: lobbyParticipants },
    participants,
  };
}

/**
 * Run all post-fetch math (Tier 1, Tier 2, combine, derived metrics) and
 * persist to D1 + KV. Used by both the synchronous and chunked paths.
 */
export async function finalizeEstimate(
  db: Db,
  kv: KVNamespace,
  params: { riotId: string; tag: string; region: Region; queue: Queue },
  puuid: string,
  rankedEntry: NonNullable<Awaited<ReturnType<typeof resolveRankedEntry>>>,
  lobbies: LobbyData[],
  matchDetails: ParticipantSummary[][],
): Promise<MmrResult> {
  const { riotId, tag, region, queue } = params;
  const { tier, division, lp, wins, losses } = rankedEntry;
  const isApex = APEX_TIERS.has(tier.toUpperCase());
  const visibleMmr = rankToMmr(tier, division, lp);

  let tier1Result = null;
  let t1Absolute = null;
  if (!isApex) {
    tier1Result = computeTier1(wins, losses);
    t1Absolute = { mu: visibleMmr + tier1Result.gapMu, sigma: tier1Result.gapSigma };
  }

  const tier2Input = lobbies.map((l) => ({
    participants: l.participants.map((p) => ({ currentMmr: p.mmr, isOpponent: p.isOpponent })),
    daysAgo: l.daysAgo,
  }));
  const tier2Raw = computeTier2(tier2Input);
  const tier2Absolute = tier2Raw
    ? { mu: tier2Raw.mu, sigma: isApex ? tier2Raw.sigma * 1.5 : tier2Raw.sigma }
    : null;

  const combined = combineEstimates(t1Absolute, tier2Absolute);
  const confidence = sigmaToConfidence(combined.sigma, tier2Absolute !== null);

  const mmrGap = combined.mu - visibleMmr;
  const lpEfficiency = computeLpEfficiency(mmrGap);
  const promoPredictor = computePromoPredictor(combined, tier, division, lp, lpEfficiency);
  const smurfFlag = computeSmurfFlag(wins, losses, mmrGap);
  const fairnessScore = computeFairnessScore(lobbies, visibleMmr);
  const climbProjection = computeClimbProjection(combined, tier, division, lp, wins, losses);

  const computedAt = Date.now();
  const lobbyEntries: LobbyEntry[] = lobbies.map((l) => ({
    matchId: l.matchId,
    date: l.date,
    win: l.win,
    lobbyMmr: computeLobbyMmr(
      l.participants.map((p) => ({ currentMmr: p.mmr, isOpponent: p.isOpponent })),
    ),
    participants: l.participants,
  }));

  const result: MmrResult = {
    summoner: { puuid, riotId, tag, region },
    rank: { tier, division, lp, wins, losses },
    mmr: {
      mu: Math.round(combined.mu),
      ci90: [Math.round(combined.ci90Low), Math.round(combined.ci90High)],
      sigma: Math.round(combined.sigma),
      lobbiesUsed: tier2Raw?.lobbiesUsed ?? 0,
      confidence,
      computedAt,
    },
    tier1: tier1Result
      ? {
          gapMu: Math.round(tier1Result.gapMu),
          gapSigma: Math.round(tier1Result.gapSigma),
          sampleSize: tier1Result.sampleSize,
        }
      : null,
    tier2: tier2Raw
      ? { mu: Math.round(tier2Raw.mu), sigma: Math.round(tier2Raw.sigma), lobbies: lobbyEntries }
      : null,
    lpEfficiency,
    promoPredictor,
    smurfFlag,
    fairnessScore,
    climbProjection,
  };

  const resultJson = JSON.stringify(result);
  await upsertEstimate(db, {
    puuid,
    queue: QUEUE_TYPE[queue],
    mmrMu: combined.mu,
    mmrSigma: combined.sigma,
    tier1Mu: t1Absolute?.mu ?? null,
    tier1Sigma: t1Absolute?.sigma ?? null,
    tier2Mu: tier2Absolute?.mu ?? null,
    tier2Sigma: tier2Absolute?.sigma ?? null,
    lobbiesUsed: tier2Raw?.lobbiesUsed ?? 0,
    computedAt,
    resultJson,
  });

  await kv.put(`estimate:${puuid}:${queue}`, resultJson, { expirationTtl: 3_600 });
  await upsertTrackedAccount(db, puuid);
  await markEstimated(db, puuid);

  return result;
}

export async function resolveParticipantRanks(
  db: Db,
  riot: RiotClient,
  participants: ParticipantSummary[],
  region: Region,
  queueType: string,
) {
  return Promise.all(
    participants.map(async (p) => {
      const cached = await findRankedEntry(db, p.puuid, queueType);
      if (cached?.fresh) return cached.data;

      try {
        const entries = await riot.getLeagueEntries(p.puuid, region);
        const now = Date.now();
        for (const entry of entries) {
          await upsertRankedEntry(db, {
            puuid: p.puuid,
            queue: entry.queueType,
            tier: entry.tier,
            division: entry.rank,
            lp: entry.leaguePoints,
            wins: entry.wins,
            losses: entry.losses,
            fetchedAt: now,
          });
        }
        const match = entries.find((e) => e.queueType === queueType);
        return match
          ? {
              puuid: p.puuid,
              queue: queueType,
              tier: match.tier,
              division: match.rank,
              lp: match.leaguePoints,
              wins: match.wins,
              losses: match.losses,
              fetchedAt: now,
            }
          : null;
      } catch (e) {
        if (e instanceof RiotNotFoundError) return null;
        throw e;
      }
    }),
  );
}

// ─── Derived metrics ──────────────────────────────────────────────────────────

function computeLpEfficiency(mmrGap: number) {
  const avgLpGain = Math.round(LP_BASE + mmrGap * LP_MMR_FACTOR);
  const avgLpLoss = Math.round(LP_BASE - mmrGap * LP_MMR_FACTOR);
  const clampedGain = Math.max(10, Math.min(35, avgLpGain));
  const clampedLoss = Math.max(10, Math.min(35, avgLpLoss));
  return {
    avgLpGain: clampedGain,
    avgLpLoss: -clampedLoss,
    breakEvenWinrate: Math.round((clampedLoss / (clampedGain + clampedLoss)) * 1000) / 1000,
  };
}

function computePromoPredictor(
  combined: CombinedEstimate,
  tier: string,
  division: string,
  lp: number,
  lpEfficiency: ReturnType<typeof computeLpEfficiency>,
) {
  if (APEX_TIERS.has(tier.toUpperCase())) return null;

  const divOrder = ['IV', 'III', 'II', 'I'];
  const divIdx = divOrder.indexOf(division);
  let nextDivMmr: number;
  let nextLabel: string;

  if (divIdx < 3) {
    const nextDiv = divOrder[divIdx + 1];
    nextDivMmr = rankToMmr(tier, nextDiv, 0);
    nextLabel = `${capitalize(tier)} ${nextDiv}`;
  } else {
    const tiers = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER'];
    const tierIdx = tiers.indexOf(tier.toUpperCase());
    if (tierIdx < 0 || tierIdx >= tiers.length - 1) return null;
    const nextTier = tiers[tierIdx + 1];
    nextDivMmr = rankToMmr(nextTier, 'IV', 0);
    nextLabel = `${capitalize(nextTier)} IV`;
  }

  const gap = nextDivMmr - combined.mu;
  if (gap <= 0) {
    return { nextRankLabel: nextLabel, gamesEstimate: 0, confidence: 'high' as const };
  }

  // ~55% wr assumption for LP-per-game estimate
  const netLpPerGame = lpEfficiency.avgLpGain * 0.55 + lpEfficiency.avgLpLoss * 0.45;
  if (netLpPerGame <= 0) return null;

  const gamesEstimate = Math.ceil(gap / netLpPerGame);
  const conf: 'high' | 'medium' | 'low' =
    combined.sigma <= 60 ? 'high' : combined.sigma <= 100 ? 'medium' : 'low';
  return { nextRankLabel: nextLabel, gamesEstimate, confidence: conf };
}

// Project where the player can realistically reach this season at their
// current pace. Uses public LP gain/loss observations and the underlying
// skill estimate; the user-facing output is rank labels + games + days,
// never raw rating numbers.
const TIERS_ASC = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
] as const;
const DIVS_ASC = ['IV', 'III', 'II', 'I'] as const;
// Apex (Master+) doesn't have divisions or a clean LP→games projection here.
// We emit a single ceiling for those accounts and skip step-by-step ETAs.
function computeClimbProjection(
  combined: CombinedEstimate,
  tier: string,
  division: string,
  lp: number,
  wins: number,
  losses: number,
): ClimbProjection {
  const T = tier.toUpperCase();
  const isApex = APEX_TIERS.has(T);
  const visibleMmr = rankToMmr(tier, division, lp);
  const ceilingValue = Math.max(visibleMmr, combined.mu);
  const ceilingLabel = mmrToRankLabel(Math.round(ceilingValue));

  const totalGames = wins + losses;
  const baselineWinrate = totalGames > 0 ? wins / totalGames : 0.5;

  // Use the LP gap + observed gain/loss pace; LP gain/loss come from
  // computeLpEfficiency which is keyed off mmrGap, so it already adapts to
  // accounts climbing fast vs. stuck.
  const mmrGap = combined.mu - visibleMmr;
  const lpEff = computeLpEfficiency(mmrGap);
  const netLpPerGame = baselineWinrate * lpEff.avgLpGain + (1 - baselineWinrate) * lpEff.avgLpLoss;

  const notes: string[] = [];
  if (totalGames < 11) notes.push('Few ranked games — projection is noisy.');
  if (combined.sigma > 100) notes.push('Wide CI — treat ETAs as rough.');

  if (isApex || netLpPerGame <= 0) {
    if (netLpPerGame <= 0) notes.push('Net LP per game is negative — climb estimate skipped.');
    return {
      ceilingLabel,
      steps: [],
      netLpPerGame: Math.round(netLpPerGame * 10) / 10,
      baselineWinrate: Math.round(baselineWinrate * 100) / 100,
      notes,
    };
  }

  // Build the next ~3 reachable brackets as steps. Each step's "decayed"
  // winrate falls 1.5pp per division climbed past current rank — a rough
  // matchmaking-regression-to-mean assumption.
  const targets: Array<{ tier: string; division: string }> = [];
  let curTier = T;
  let curDiv = division.toUpperCase();
  for (let i = 0; i < 4; i++) {
    const next = nextRank(curTier, curDiv);
    if (!next) break;
    targets.push(next);
    curTier = next.tier;
    curDiv = next.division;
  }

  const steps: ClimbStep[] = [];
  for (const t of targets) {
    const targetMmr = rankToMmr(t.tier, t.division, 0);
    const lpGap = targetMmr - visibleMmr;
    if (lpGap <= 0) continue;

    const divsAway = lpGap / 100;
    const decayedWr = Math.max(0.4, baselineWinrate - divsAway * 0.015);
    const decayedNet = decayedWr * lpEff.avgLpGain + (1 - decayedWr) * lpEff.avgLpLoss;
    if (decayedNet <= 0) {
      notes.push(
        `Stalls before ${capitalize(t.tier)} ${t.division} at the projected winrate decay.`,
      );
      break;
    }

    const games = Math.ceil(lpGap / decayedNet);
    // Assume 5 ranked games / day at sustainable cadence.
    const days = Math.max(1, Math.round(games / 5));
    steps.push({
      label: `${capitalize(t.tier)} ${t.division}`,
      games,
      days,
      decayedWinrate: Math.round(decayedWr * 100),
      beyondCeiling: targetMmr > ceilingValue + 50,
    });
  }

  return {
    ceilingLabel,
    steps,
    netLpPerGame: Math.round(netLpPerGame * 10) / 10,
    baselineWinrate: Math.round(baselineWinrate * 100) / 100,
    notes,
  };
}

function nextRank(tier: string, division: string): { tier: string; division: string } | null {
  const T = tier.toUpperCase();
  const D = division.toUpperCase();
  if (APEX_TIERS.has(T)) return null;
  const dIdx = DIVS_ASC.indexOf(D as (typeof DIVS_ASC)[number]);
  if (dIdx < 0) return null;
  if (dIdx < DIVS_ASC.length - 1) {
    return { tier: T, division: DIVS_ASC[dIdx + 1] };
  }
  const tIdx = TIERS_ASC.indexOf(T as (typeof TIERS_ASC)[number]);
  if (tIdx < 0 || tIdx >= TIERS_ASC.length - 1) return null;
  return { tier: TIERS_ASC[tIdx + 1], division: 'IV' };
}

function computeSmurfFlag(wins: number, losses: number, mmrGap: number) {
  const total = wins + losses;
  const winrate = total > 0 ? wins / total : 0;
  const reasons: string[] = [];
  let score = 0;

  if (total < 30) {
    score += 0.2;
    reasons.push('low game count');
  }
  if (winrate > 0.7 && total < 100) {
    score += 0.3;
    reasons.push('high win rate');
  }
  if (mmrGap > 300) {
    score += 0.3;
    reasons.push('MMR far above visible rank');
  }
  // TODO: refine with per-game KDA divergence when match data is richer

  return { score: Math.min(1, Math.round(score * 10) / 10), reasons };
}

// Average per-lobby team-MMR spread (max − min within each side, including the
// player on their own team), and whether enemy avg trended higher or lower
// than your team avg. Only lobbies where both sides are populated count.
function computeFairnessScore(lobbies: LobbyData[], playerMmr: number) {
  let teamSpreadSum = 0;
  let enemySpreadSum = 0;
  let teamMinusEnemyAvgSum = 0;
  let count = 0;

  for (const lobby of lobbies) {
    const teammates = lobby.participants.filter((p) => !p.isOpponent).map((p) => p.mmr);
    const enemies = lobby.participants.filter((p) => p.isOpponent).map((p) => p.mmr);
    if (teammates.length === 0 || enemies.length === 0) continue;

    const teamMmrs = [playerMmr, ...teammates];
    const teamSpread = Math.max(...teamMmrs) - Math.min(...teamMmrs);
    const enemySpread = Math.max(...enemies) - Math.min(...enemies);
    const teamAvg = teamMmrs.reduce((a, b) => a + b, 0) / teamMmrs.length;
    const enemyAvg = enemies.reduce((a, b) => a + b, 0) / enemies.length;

    teamSpreadSum += teamSpread;
    enemySpreadSum += enemySpread;
    teamMinusEnemyAvgSum += teamAvg - enemyAvg;
    count++;
  }

  if (count === 0) {
    return { teamMmrSpread: 0, enemyMmrSpread: 0, verdict: 'balanced' as const };
  }

  const teamMmrSpread = Math.round(teamSpreadSum / count);
  const enemyMmrSpread = Math.round(enemySpreadSum / count);
  const avgTeamMinusEnemy = teamMinusEnemyAvgSum / count;

  // Threshold of ±30 MMR averaged across lobbies — narrower than that is noise.
  let verdict: 'balanced' | 'unfavorable' | 'favorable' = 'balanced';
  if (avgTeamMinusEnemy > 30) verdict = 'favorable';
  else if (avgTeamMinusEnemy < -30) verdict = 'unfavorable';

  return { teamMmrSpread, enemyMmrSpread, verdict };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
