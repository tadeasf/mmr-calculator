// Re-export for the post-build inject-do.mjs script.
// This file is bundled separately and appended to _worker.js so Cloudflare
// can resolve the RateLimiterDO class name from the wrangler.jsonc binding.
export { RateLimiterDO } from '@mmr-calculator/riot-client';
