# Architecture

## Request flow

```
Browser
  → SvelteKit page (apps/web/src/routes)
    → +page.ts loader
      → fetch /api/v1/mmr?region=…&riotId=…
        → Hono route in +server.ts
          → @mmr-calculator/db   (D1 cache check)
          → @mmr-calculator/riot-client (rate-limited fetches on miss)
          → @mmr-calculator/core (tier1 + tier2 + combine)
        ← (mu, sigma, ci90, breakdown)
    ← rendered Svelte component
```

The frontend never talks to Riot directly. All Riot calls flow through the rate-limited
client running in the same Worker.

## Packages

### `packages/core`

Pure functions, no I/O. Trivially testable.

- `tier1.ts` — win-behavior estimator
- `tier2.ts` — lobby-composition estimator
- `combine.ts` — inverse-variance combination + sigma floor
- `conversion.ts` — `tier/division/lp → MMR` and the inverse mapping
- `confidence.ts` — CI helpers (90% / 80% / 50%)

### `packages/riot-client`

Typed wrapper over the Riot API.

- `client.ts` — endpoint methods (`league-v4`, `match-v5`, `summoner-v4`, `account-v1`)
- `rate-limiter.ts` — token-bucket layered over the Durable Object's global counters
- `regions.ts` — platform/region routing tables
- `schemas.ts` — Zod schemas for every response we touch

### `packages/db`

Drizzle ORM bound to D1.

- `schema.ts` — tables for `summoners`, `matches`, `ranked_entries`, `mmr_snapshots`
- `repository.ts` — query helpers (cache reads, snapshot writes)

### `apps/web`

SvelteKit app. Routes:

- `/` — landing
- `/summoner/[region]/[slug]` — result page (loader hits `/api/v1/mmr`)
- `/compare` — multi-account compare
- `/methodology` — public-facing methodology page (separate from these dev docs)
- `/faq`
- `/api/v1/*` — Hono-mounted endpoints

## Caching layers

| Layer | TTL | Purpose |
| --- | --- | --- |
| KV `CACHE` | minutes | Hot summoner / match-id lookups, dedup repeated requests |
| D1 `ranked_entries` | 24h | Per-summoner rank, hit by Tier 2's 9-participant lookups |
| D1 `matches` | indefinite | Match payloads — they never change once finalized |
| D1 `mmr_snapshots` | indefinite | Daily snapshots for the future LP-delta tier |

D1 is the load-bearing one. Tier 2's worst case is ~180 API calls; with D1 hitting on
already-seen participants, repeat requests against popular players collapse to a handful.

## Rate limiting

A single `RateLimiterDO` Durable Object holds the global token bucket. Every Riot call
asks the DO for a token before going out. Configured for dev-key limits (20/1s, 100/2m) by
default; production-key limits are a config swap.

The DO is bundled separately by `apps/web/scripts/inject-do.mjs` and stitched into the
SvelteKit-generated `_worker.js` post-build. This is necessary because SvelteKit's
adapter doesn't know about Durable Object class exports.

## Cron jobs

`wrangler.jsonc` declares two triggers:

- `30 0 * * *` — daily LP snapshot. For every summoner we've seen recently, write a row
  into `mmr_snapshots`. Feeds the future LP-delta tier.
- `0 */6 * * *` — cache compactor. Drops `ranked_entries` older than 24h and trims
  `matches` for accounts inactive >90 days.

Both handlers live in `apps/web/src/lib/server/cron.ts` and are wired into the worker by
the same post-build script that handles the DO.
