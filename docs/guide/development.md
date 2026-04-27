# Development

## Prerequisites

- [Bun](https://bun.sh/) (the package manager — workspaces are `apps/*` and `packages/*`)
- A Riot API key from [developer.riotgames.com](https://developer.riotgames.com/) (a dev
  key is fine for local work)
- A Cloudflare account if you want to test against real D1/KV

## Setup

```bash
bun install
```

Create `apps/web/.dev.vars` for local secrets:

```
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Apply migrations to the local D1 instance:

```bash
bunx wrangler d1 migrations apply mmr-calculator --local
```

## Common commands

```bash
bun run dev          # SvelteKit + wrangler dev (localhost:5173)
bun run build        # vite build → SvelteKit cloudflare adapter → DO/cron injection
bun test             # vitest with the workers pool
bun run typecheck    # svelte-check + tsc --noEmit across all workspaces
bun run lint         # biome check
bun run format       # biome format --write

bun run docs:dev     # vitepress dev server
bun run docs:build   # build static site to docs/.vitepress/dist
```

## What `bun run build` does

1. `vite build` produces the SvelteKit output under `apps/web/.svelte-kit/cloudflare/`.
2. `apps/web/scripts/inject-do.mjs` runs:
   - Bundles `RateLimiterDO` from `src/lib/server/rate-limiter.do.ts` into
     `_rate_limiter_do.js`.
   - Bundles the `scheduled()` cron handler from `src/lib/server/cron.ts` into
     `_cron.js`.
   - Rewrites `_worker.js` to re-export the DO class and to add the cron handler.

This wrapper exists because `@sveltejs/adapter-cloudflare` does not natively know about
Durable Object class exports or scheduled handlers.

## Adding a new API route

Create `apps/web/src/routes/api/v1/<name>/+server.ts`. SvelteKit picks it up
automatically. For shared logic, prefer adding helpers under
`apps/web/src/lib/server/` rather than expanding the `+server.ts` file inline.

## Testing the estimator math

`packages/core` is pure — no Worker bindings, no fetch. Run its tests directly:

```bash
bun --cwd packages/core test
```

For tests that need bindings (DB, KV, Riot client), `vitest run` at the root will use the
`@cloudflare/vitest-pool-workers` pool to spin up a Miniflare environment.
