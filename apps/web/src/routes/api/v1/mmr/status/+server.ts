import { type RequestHandler, error, json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, platform }) => {
  const id = url.searchParams.get('id');
  if (!id) throw error(400, 'Missing job id');

  const env = platform?.env;
  if (!env?.ESTIMATE_JOB) throw error(503, 'Job runner not configured');

  const stub = env.ESTIMATE_JOB.get(env.ESTIMATE_JOB.idFromName(id));
  const doRes = await stub.fetch('https://estimate-job/status', { method: 'GET' });

  if (doRes.status === 404) {
    return json({ stage: 'not_found' as const, message: 'Job not found' }, { status: 404 });
  }

  const body = await doRes.json();
  return json(body, {
    headers: { 'Cache-Control': 'no-store' },
  });
};
