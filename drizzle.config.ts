import type { Config } from 'drizzle-kit';

export default {
  schema: './packages/db/src/schema.ts',
  out: './packages/db/drizzle',
  dialect: 'sqlite',
} satisfies Config;
