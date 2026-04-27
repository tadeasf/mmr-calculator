import { type RequestHandler, error, json } from '@sveltejs/kit';
import { z } from 'zod';

const StartSchema = z.object({
  riotId: z.string().min(1).max(50),
  tag: z.string().min(1).max(10),
  region: z.enum(['na', 'euw', 'eune', 'kr', 'br', 'jp', 'oce', 'ru', 'tr', 'lan', 'las']),
  queue: z.enum(['solo', 'flex']).default('solo'),
});

function jobIdFor(params: z.infer<typeof StartSchema>) {
  return `${params.region}:${params.riotId.toLowerCase()}:${params.tag.toLowerCase()}:${params.queue}`;
}

export const POST: RequestHandler = async ({ request, platform }) => {
  const body = await request.json().catch(() => null);
  const parsed = StartSchema.safeParse(body);
  if (!parsed.success) {
    throw error(400, parsed.error.flatten().fieldErrors as unknown as string);
  }
  const params = parsed.data;

  const env = platform?.env;
  if (!env?.RIOT_API_KEY) throw error(503, 'Riot API key not configured');
  if (!env.ESTIMATE_JOB) throw error(503, 'Job runner not configured');

  const id = jobIdFor(params);
  const stub = env.ESTIMATE_JOB.get(env.ESTIMATE_JOB.idFromName(id));

  const doRes = await stub.fetch('https://estimate-job/start', {
    method: 'POST',
    body: JSON.stringify(params),
    headers: { 'content-type': 'application/json' },
  });
  const doBody = await doRes.json();
  return json({ jobId: id, ...(doBody as object) });
};
