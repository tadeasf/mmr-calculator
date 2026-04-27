// Post-build script: injects RateLimiterDO export and scheduled() cron handler
// into the SvelteKit-generated _worker.js so Cloudflare can wire them up.
// Run automatically via: bun run build (see apps/web/package.json).

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dir, '../.svelte-kit/cloudflare');
const workerPath = resolve(outDir, '_worker.js');
const workerBasePath = resolve(outDir, '_worker_base.js');

// Idempotent: skip if already patched
if (readFileSync(workerPath, 'utf8').includes('RateLimiterDO')) {
  process.exit(0);
}

// Step 1: rename generated worker so we can wrap it
renameSync(workerPath, workerBasePath);

// Step 2: bundle RateLimiterDO
await build({
  entryPoints: [resolve(__dir, '../src/lib/server/rate-limiter.do.ts')],
  bundle: true,
  format: 'esm',
  outfile: resolve(outDir, '_rate_limiter_do.js'),
  external: ['cloudflare:workers'],
  target: 'es2022',
  logLevel: 'silent',
});

// Step 3: bundle cron handler
await build({
  entryPoints: [resolve(__dir, '../src/lib/server/cron.ts')],
  bundle: true,
  format: 'esm',
  outfile: resolve(outDir, '_cron.js'),
  external: ['cloudflare:workers'],
  target: 'es2022',
  logLevel: 'silent',
  // resolve workspace packages from the monorepo root node_modules
  nodePaths: [resolve(__dir, '../../../node_modules')],
});

// Step 4: write new _worker.js wrapper
writeFileSync(
  workerPath,
  `import base from './_worker_base.js';
import { handleScheduled } from './_cron.js';
export { RateLimiterDO } from './_rate_limiter_do.js';
export default { ...base, scheduled: handleScheduled };
`,
);

console.log('✓ Injected RateLimiterDO and scheduled() handler into _worker.js');
