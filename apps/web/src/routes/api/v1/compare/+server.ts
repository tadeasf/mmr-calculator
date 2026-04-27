import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

const BodySchema = z.object({
  a: z.object({ riotId: z.string(), tag: z.string(), region: z.string() }),
  b: z.object({ riotId: z.string(), tag: z.string(), region: z.string() }),
  queue: z.enum(['solo', 'flex']),
});

// TODO: implement (step 8)
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    throw error(400, 'Invalid request body');
  }

  throw error(501, 'Compare not yet implemented');
};
