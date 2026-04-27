# Introduction

This project was scaffolded from `template-ts-worker` by the `infra-projects` Terraform
pipeline. The repo, D1 database, and CI secrets were all provisioned declaratively.

## Stack

- **Runtime**: Cloudflare Workers
- **Framework**: [Hono](https://hono.dev)
- **Database**: Cloudflare D1 (bound as `DB`)
- **Tests**: Vitest + `@cloudflare/vitest-pool-workers`
- **Lint/format**: Biome
- **Package manager**: Bun
- **Docs**: VitePress → GitHub Pages
