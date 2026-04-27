# template-ts-worker

GitHub **template repository** for TypeScript Cloudflare Worker projects scaffolded by
[`infra-projects`](../infra-projects). Do not clone this directly — reference it from a
Terraform module and let the pipeline produce a new repo.

## What's inside

- **Hono** app skeleton with typed D1 binding (`src/index.ts`)
- **Vitest** with `@cloudflare/vitest-pool-workers` (`test/`)
- **Biome** for lint + format
- **Bun** as the package manager
- **VitePress** docs → GitHub Pages
- **GitHub Actions**: `ci.yml` (lint/typecheck/test/build), `deploy.yml` (wrangler deploy
  on push to `main`), `docs.yml` (publish VitePress)
- **Dependabot** for weekly npm + actions updates

## Placeholders

`wrangler.jsonc`, `docs/.vitepress/config.ts`, and `docs/index.md` contain
`__PROJECT_NAME__`, `__D1_DATABASE_ID__`, `__D1_DATABASE_NAME__`. `deploy.yml` and
`docs.yml` substitute these at build time from GitHub Actions secrets provisioned by
Terraform. Do not substitute them by hand.

## How it becomes a real project

1. Operator adds a `module "foo" { source = "../modules/ts-worker-project"; ... }`
   stanza in `infra-projects/projects/`.
2. `terraform apply` creates a new GitHub repo from this template, a Cloudflare D1
   database, and injects the four required secrets into the child repo.
3. First push to `main` of the child repo triggers `deploy.yml` → `wrangler deploy`.

## Publishing this template

Create a GitHub repo, push these files, then enable "Template repository" in
Settings → General.
