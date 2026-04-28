import type {
  D1Database,
  DurableObjectNamespace,
  DurableObjectState,
  KVNamespace,
} from '@cloudflare/workers-types';
import { createDb } from '@mmr-calculator/db';
import {
  RateLimiterClient,
  type Region,
  RiotClient,
  RiotRateLimitError,
} from '@mmr-calculator/riot-client';
import {
  type LobbyData,
  MAX_GAMES,
  type MmrResult,
  type ParticipantSummary,
  QUEUE_ID,
  type Queue,
  finalizeEstimate,
  processOneMatch,
  resolvePuuid,
  resolveRankedEntry,
} from './estimate';

interface JobEnv {
  DB: D1Database;
  CACHE: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  RIOT_API_KEY: string;
}

interface JobParams {
  riotId: string;
  tag: string;
  region: Region;
  queue: Queue;
}

type JobStage =
  | 'queued'
  | 'resolving_account'
  | 'fetching_matches'
  | 'computing'
  | 'done'
  | 'unranked'
  | 'error';

interface JobStatus {
  stage: JobStage;
  message: string;
  matchesTotal: number;
  matchesProcessed: number;
  lobbiesUsed: number;
  error?: string;
  result?: MmrResult;
  summoner?: { puuid: string; riotId: string; tag: string; region: string };
  // Set when the Riot rate limiter forced a backoff. The DO alarm has been
  // scheduled for this timestamp; the frontend can show a countdown.
  rateLimitedUntil?: number;
  startedAt: number;
  updatedAt: number;
}

// Per-alarm budget: 4 matches × ~10 subrequests = ~40, leaves headroom under
// the free-plan 50-subrequest cap for the rate limiter pings + DB writes.
const CHUNK_SIZE = 4;
// Stale jobs older than 10 min are reset on a fresh /start so a hung job
// doesn't lock the DO forever.
const STALE_JOB_MS = 10 * 60 * 1_000;

export class EstimateJobDO {
  private state: DurableObjectState;
  private env: JobEnv;

  constructor(state: DurableObjectState, env: JobEnv) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'POST' && path === '/start') {
      const body = (await request.json()) as JobParams;
      return this.handleStart(body);
    }

    if (request.method === 'GET' && path === '/status') {
      return this.handleStatus();
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleStart(params: JobParams): Promise<Response> {
    const existing = await this.state.storage.get<JobStatus>('status');
    const now = Date.now();

    // If a job is already terminal (done/error/unranked), let the caller poll
    // /status directly — don't restart unless it's stale.
    if (existing) {
      const isTerminal =
        existing.stage === 'done' || existing.stage === 'error' || existing.stage === 'unranked';
      const isStale = now - existing.updatedAt > STALE_JOB_MS;
      if (isTerminal || isStale) {
        console.log('[EstimateJobDO] resetting', { stage: existing.stage, isStale });
        await this.reset();
      } else {
        // In-flight — return current status, don't restart
        return Response.json({ stage: existing.stage });
      }
    }

    const status: JobStatus = {
      stage: 'queued',
      message: 'Job queued',
      matchesTotal: 0,
      matchesProcessed: 0,
      lobbiesUsed: 0,
      startedAt: now,
      updatedAt: now,
    };
    await this.state.storage.put('status', status);
    await this.state.storage.put('params', params);
    await this.state.storage.setAlarm(now);

    console.log('[EstimateJobDO] queued', { region: params.region, queue: params.queue });
    return Response.json({ stage: 'queued' });
  }

  private async handleStatus(): Promise<Response> {
    const status = await this.state.storage.get<JobStatus>('status');
    if (!status) {
      return new Response(JSON.stringify({ error: 'job not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    return Response.json(status);
  }

  async alarm(): Promise<void> {
    const status = await this.state.storage.get<JobStatus>('status');
    const params = await this.state.storage.get<JobParams>('params');
    if (!status || !params) {
      console.warn('[EstimateJobDO] alarm fired with no state');
      return;
    }
    if (status.stage === 'done' || status.stage === 'error' || status.stage === 'unranked') return;

    console.log('[EstimateJobDO] alarm', {
      stage: status.stage,
      processed: status.matchesProcessed,
      total: status.matchesTotal,
      rateLimitedUntil: status.rateLimitedUntil,
    });

    try {
      if (status.stage === 'queued' || status.stage === 'resolving_account') {
        await this.runInit(params, status);
      } else if (status.stage === 'fetching_matches') {
        await this.runMatchChunk(params, status);
      } else if (status.stage === 'computing') {
        await this.runFinalize(params, status);
      }
      // Made progress — clear any stale backoff marker.
      if (status.rateLimitedUntil) {
        const fresh = await this.state.storage.get<JobStatus>('status');
        if (fresh?.rateLimitedUntil) {
          await this.update({ ...fresh, rateLimitedUntil: undefined });
        }
      }
    } catch (err) {
      // Riot rate-limit isn't a failure — we just need to wait. Reschedule
      // the alarm at the retry time + a small jitter, leave the stage
      // unchanged so we resume where we left off, and surface the wait
      // through `rateLimitedUntil` so the UI can show a countdown. Re-read
      // status from storage in case the runner advanced it before throwing.
      const latest = (await this.state.storage.get<JobStatus>('status')) ?? status;
      if (err instanceof RiotRateLimitError) {
        const jitterMs = Math.floor(Math.random() * 500);
        const retryAfterMs = Math.max(1_000, err.retryAfterMs + jitterMs);
        const retryAt = Date.now() + retryAfterMs;
        console.warn('[EstimateJobDO] rate-limited; backing off', {
          stage: latest.stage,
          retryAfterMs,
          retryAt,
        });
        await this.update({
          ...latest,
          rateLimitedUntil: retryAt,
          message: `Rate limited by Riot — retrying in ${Math.ceil(retryAfterMs / 1000)}s`,
        });
        await this.state.storage.setAlarm(retryAt);
        return;
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[EstimateJobDO] alarm failed', { stage: latest.stage, error: errMsg }, err);
      await this.update({
        ...latest,
        stage: 'error',
        message: 'Computation failed',
        error: errMsg,
      });
    }
  }

  // ─── Stage runners ──────────────────────────────────────────────────────────

  private async runInit(params: JobParams, status: JobStatus): Promise<void> {
    await this.update({
      ...status,
      stage: 'resolving_account',
      message: 'Looking up summoner and ranked stats',
    });

    const { riotClient, db } = this.makeClients();
    const { riotId, tag, region, queue } = params;

    const puuid = await resolvePuuid(db, riotClient, riotId, tag, region);
    const rankedEntry = await resolveRankedEntry(db, riotClient, puuid, region, queue);

    if (!rankedEntry) {
      await this.update({
        ...status,
        stage: 'unranked',
        message: 'No ranked entry for this account',
        summoner: { puuid, riotId, tag, region },
      });
      return;
    }

    const matchIds = await riotClient.getMatchIds(puuid, region, QUEUE_ID[queue], MAX_GAMES);

    await this.state.storage.put('puuid', puuid);
    await this.state.storage.put('rankedEntry', rankedEntry);
    await this.state.storage.put('matchIds', matchIds);
    await this.state.storage.put('lobbies', [] as LobbyData[]);
    await this.state.storage.put('matchDetails', [] as ParticipantSummary[][]);

    await this.update({
      ...status,
      stage: matchIds.length > 0 ? 'fetching_matches' : 'computing',
      message:
        matchIds.length > 0
          ? `Fetching match history (0 of ${matchIds.length})`
          : 'Combining estimates',
      matchesTotal: matchIds.length,
      matchesProcessed: 0,
      summoner: { puuid, riotId, tag, region },
    });
    await this.state.storage.setAlarm(Date.now());
  }

  private async runMatchChunk(params: JobParams, status: JobStatus): Promise<void> {
    const puuid = await this.state.storage.get<string>('puuid');
    const matchIds = await this.state.storage.get<string[]>('matchIds');
    const lobbies = (await this.state.storage.get<LobbyData[]>('lobbies')) ?? [];
    const matchDetails =
      (await this.state.storage.get<ParticipantSummary[][]>('matchDetails')) ?? [];

    if (!puuid || !matchIds) {
      throw new Error('Missing job state for fetch chunk');
    }

    const { riotClient, db } = this.makeClients();
    const { region, queue } = params;

    const start = status.matchesProcessed;
    const end = Math.min(start + CHUNK_SIZE, matchIds.length);

    for (let i = start; i < end; i++) {
      const matchId = matchIds[i];
      const out = await processOneMatch(db, riotClient, puuid, region, queue, matchId);
      if (out.lobby) lobbies.push(out.lobby);
      if (out.participants) matchDetails.push(out.participants);
    }

    await this.state.storage.put('lobbies', lobbies);
    await this.state.storage.put('matchDetails', matchDetails);

    const processed = end;
    const total = matchIds.length;
    const moreToFetch = processed < total;

    await this.update({
      ...status,
      stage: moreToFetch ? 'fetching_matches' : 'computing',
      message: moreToFetch
        ? `Fetching match history (${processed} of ${total})`
        : 'Combining estimates',
      matchesProcessed: processed,
      lobbiesUsed: lobbies.length,
    });
    await this.state.storage.setAlarm(Date.now());
  }

  private async runFinalize(params: JobParams, status: JobStatus): Promise<void> {
    const puuid = await this.state.storage.get<string>('puuid');
    const rankedEntry =
      await this.state.storage.get<NonNullable<Awaited<ReturnType<typeof resolveRankedEntry>>>>(
        'rankedEntry',
      );
    const lobbies = (await this.state.storage.get<LobbyData[]>('lobbies')) ?? [];
    const matchDetails =
      (await this.state.storage.get<ParticipantSummary[][]>('matchDetails')) ?? [];

    if (!puuid || !rankedEntry) throw new Error('Missing job state for finalize');

    const { db } = this.makeClients();
    const result = await finalizeEstimate(
      db,
      this.env.CACHE,
      params,
      puuid,
      rankedEntry,
      lobbies,
      matchDetails,
    );

    await this.update({
      ...status,
      stage: 'done',
      message: 'Estimate ready',
      lobbiesUsed: lobbies.length,
      result,
      summoner: result.summoner,
    });

    // Drop large intermediate state once we have the final result. Keep the
    // status row around for a while so late polls still find it.
    await this.state.storage.delete([
      'matchIds',
      'lobbies',
      'matchDetails',
      'rankedEntry',
      'puuid',
    ]);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private makeClients() {
    const rateLimiter = new RateLimiterClient(this.env.RATE_LIMITER);
    const riotClient = new RiotClient(this.env.RIOT_API_KEY, rateLimiter);
    const db = createDb(this.env.DB);
    return { riotClient, db };
  }

  private async update(next: JobStatus): Promise<void> {
    next.updatedAt = Date.now();
    await this.state.storage.put('status', next);
  }

  private async reset(): Promise<void> {
    await this.state.storage.deleteAll();
  }
}
