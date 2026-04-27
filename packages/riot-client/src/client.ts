import type { z } from 'zod';
import type { RateLimiterClient } from './rate-limiter';
import { type Region, platformHost, regionalHost } from './regions';
import {
  type Account,
  AccountSchema,
  LeagueEntriesSchema,
  type LeagueEntry,
  type Match,
  MatchIdsSchema,
  MatchSchema,
} from './schemas';

export class RiotError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'RiotError';
  }
}

export class RiotNotFoundError extends RiotError {
  constructor(message: string) {
    super(404, message);
    this.name = 'RiotNotFoundError';
  }
}

export class RiotRateLimitError extends RiotError {
  constructor(public readonly retryAfterMs: number) {
    super(429, `Rate limited; retry after ${retryAfterMs}ms`);
    this.name = 'RiotRateLimitError';
  }
}

// Max milliseconds to wait on a preemptive rate-limit before giving up
const MAX_WAIT_MS = 2_000;
// Max retries when the DO signals we must wait
const MAX_ACQUIRE_RETRIES = 3;

export class RiotClient {
  constructor(
    private readonly apiKey: string,
    private readonly rateLimiter?: RateLimiterClient,
  ) {}

  async getAccountByRiotId(name: string, tag: string, region: Region): Promise<Account> {
    const url = `${regionalHost(region)}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
    return this.req(url, AccountSchema);
  }

  async getLeagueEntries(puuid: string, region: Region): Promise<LeagueEntry[]> {
    const url = `${platformHost(region)}/lol/league/v4/entries/by-puuid/${puuid}`;
    return this.req(url, LeagueEntriesSchema);
  }

  async getMatchIds(
    puuid: string,
    region: Region,
    queue: 420 | 440,
    count = 20,
  ): Promise<string[]> {
    const url = `${regionalHost(region)}/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=${queue}&count=${count}&type=ranked`;
    return this.req(url, MatchIdsSchema);
  }

  async getMatch(matchId: string, region: Region): Promise<Match> {
    const url = `${regionalHost(region)}/lol/match/v5/matches/${matchId}`;
    return this.req(url, MatchSchema);
  }

  private async req<T>(url: string, schema: z.ZodType<T>): Promise<T> {
    await this.acquireToken();

    const res = await globalThis.fetch(url, {
      headers: { 'X-Riot-Token': this.apiKey },
    });

    if (res.status === 404) throw new RiotNotFoundError(`Not found: ${url}`);

    if (res.status === 429) {
      const retryAfterMs = Number(res.headers.get('Retry-After') ?? '1') * 1_000;
      throw new RiotRateLimitError(retryAfterMs);
    }

    if (!res.ok) throw new RiotError(res.status, `Riot API ${res.status}: ${url}`);

    return schema.parse(await res.json());
  }

  private async acquireToken(): Promise<void> {
    if (!this.rateLimiter) return;

    for (let i = 0; i < MAX_ACQUIRE_RETRIES; i++) {
      const result = await this.rateLimiter.acquire();
      if (result.ok) return;

      const wait = result.retryAfterMs ?? 0;
      if (wait > MAX_WAIT_MS) throw new RiotRateLimitError(wait);

      await new Promise((r) => setTimeout(r, wait));
    }
    throw new RiotRateLimitError(MAX_WAIT_MS);
  }
}
