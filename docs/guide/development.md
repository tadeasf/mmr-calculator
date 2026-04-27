# Development

```bash
bun install
bun run dev          # wrangler dev (local)
bun test             # vitest with workers pool
bun run lint         # biome check
bun run typecheck    # tsc --noEmit
bun run docs:dev     # vitepress dev
```

## Deploy

Push to `main`. CI runs `bun run build`, `bun test`, `biome check`, then `wrangler deploy`
using the `CLOUDFLARE_API_TOKEN` and `D1_DATABASE_ID` secrets injected by Terraform.
You do not manage those secrets by hand.
