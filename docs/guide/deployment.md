# Deployment

The project deploys to Cloudflare Workers via two GitHub Actions workflows.

## Workflows

| Workflow | Trigger | Job |
| --- | --- | --- |
| `.github/workflows/ci.yml` | every PR + push to `main` | lint, typecheck, tests, dry-run build |
| `.github/workflows/deploy.yml` | push to `main` | `bun run build` → `wrangler deploy` |
| `.github/workflows/docs.yml` | push to `main` touching `docs/**` | VitePress build → GitHub Pages |

## Required GitHub secrets

| Secret | Used by | Notes |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | `deploy.yml` | needs `Workers Scripts:Edit`, `D1:Edit`, `KV:Edit` |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy.yml` | account that owns the Worker |

`wrangler.jsonc` is checked in with the real D1 and KV ids — no secret substitution
happens in CI any more.

## Worker secrets (set once, not via CI)

```bash
bunx wrangler secret put RIOT_API_KEY
```

Set the value to a production Riot API key once you have one. Until then, the dev-key
rate limits (20 req/s, 100 req/2 min) apply, which makes Tier 2's cold path slow.

## First-time provisioning

1. **Create the D1 database** (if it doesn't exist):
   ```bash
   bunx wrangler d1 create mmr-calculator-db
   ```
   Copy the `database_id` into `wrangler.jsonc`.
2. **Apply migrations to production:**
   ```bash
   bunx wrangler d1 migrations apply mmr-calculator --remote
   ```
3. **Create the KV namespace** (if it doesn't exist):
   ```bash
   bunx wrangler kv namespace create CACHE
   ```
   Paste the returned id into `wrangler.jsonc` under `kv_namespaces[0].id`.
4. **Set the Riot API key:**
   ```bash
   bunx wrangler secret put RIOT_API_KEY
   ```
5. **First deploy:** push to `main`. The workflow runs `bun run build` then
   `wrangler deploy`.

## Custom domain

`wrangler.jsonc` does not yet declare a route. Once the Worker is live, point the desired
hostname at it via the Cloudflare dashboard (Workers Routes) or by adding a `routes`
entry to the wrangler config.

## Troubleshooting

**`The entry-point file at "apps/web/.svelte-kit/cloudflare/_worker.js" was not found.`**
The deploy workflow is missing the build step. The current `deploy.yml` runs
`bun run build` before `wrangler deploy`; if you forked it, make sure your variant does
the same.

**`Workers KV: namespace not found`**
The placeholder KV id is still in `wrangler.jsonc`. Run the create command above and
paste the real id in.

**Cron triggers not firing**
Confirm in `wrangler.jsonc` that `triggers.crons` is set, and that the post-build
injector actually wrote `_cron.js` into `apps/web/.svelte-kit/cloudflare/`. The
`inject-do.mjs` script is idempotent and skips work if `_worker.js` already contains the
markers.

## Docs site

`docs.yml` builds the VitePress site from `docs/` and publishes it to GitHub Pages on
every push to `main` that touches `docs/**`. Enable GitHub Pages with source
"GitHub Actions" once before the first publish; after that the workflow is hands-off.
