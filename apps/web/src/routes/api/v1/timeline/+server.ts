import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';

const QuerySchema = z.object({
  puuid: z.string().min(1),
  queue: z.enum(['solo', 'flex']).default('solo'),
  days: z
    .string()
    .optional()
    .transform((v) => Number(v ?? '30'))
    .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)])),
});

// TODO: implement (step 8)
export const GET: RequestHandler = async ({ url }) => {
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    throw error(400, 'Invalid query parameters');
  }

  throw error(404, 'Timeline data starts after first check; come back tomorrow.');
};
