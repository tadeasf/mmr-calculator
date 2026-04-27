# Introduction

MMR Calculator estimates a League of Legends account's matchmaking rating from public Riot
API data and reports the result as a 90% confidence interval. It is built specifically to
avoid the failure mode of existing tools, which take a player's visible rank and multiply
their win rate against a constant — producing an output that cannot meaningfully differ from
the input.

## What it does differently

Instead of one weak signal, the estimator combines two:

- **Tier 1 — Win behavior.** A player's deviation from a 50% win rate, scaled by sample
  size, gives a cheap (1 API call) estimate of how the matchmaker is treating them.
- **Tier 2 — Lobby composition.** For each of the last 20 ranked games, every other
  participant's current rank is looked up and aggregated into a recency-weighted lobby
  average. Opponents weigh more than teammates. This is the only publicly-derivable MMR
  signal that does not depend on the player's own rank.

The two estimates are combined by inverse-variance weighting (Tier 3), which automatically
trusts whichever tier is more confident for a given account. The output is always a
distribution, never a point estimate.

See [Methodology](./methodology) for the math and [ADR-0001](/decisions/0001-three-tier-mmr-estimator)
for the design rationale.

## Stack

- **Frontend**: SvelteKit (Svelte 5) on Cloudflare Workers via `@sveltejs/adapter-cloudflare`
- **API**: Hono routes mounted under `/api/v1/*`
- **Database**: Cloudflare D1, accessed through Drizzle ORM
- **Cache**: Cloudflare KV for hot summoner/match lookups
- **Rate limiter**: A Durable Object enforces Riot's 20/1s and 100/2m windows globally
- **Cron**: Two scheduled triggers — daily LP snapshots and a 6-hourly cache compactor
- **Tests**: Vitest with `@cloudflare/vitest-pool-workers`
- **Lint/format**: Biome
- **Package manager**: Bun (workspaces under `apps/*` and `packages/*`)

## Repository layout

```
apps/web                    SvelteKit app (UI + API routes)
packages/core               Pure estimator math (tier1, tier2, combine, conversion)
packages/db                 Drizzle schema + repository
packages/riot-client        Typed Riot API client + rate limiter
docs/                       This site
```

## Where to go next

- [Methodology](./methodology) — what the three tiers actually compute
- [Architecture](./architecture) — request flow, caching layers, cron jobs
- [API reference](./api) — public HTTP endpoints
- [Development](./development) — running it locally
- [Deployment](./deployment) — getting it into production on Cloudflare
