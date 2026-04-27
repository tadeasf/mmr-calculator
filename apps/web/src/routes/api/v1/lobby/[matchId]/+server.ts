import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

// TODO: implement (step 8)
export const GET: RequestHandler = async ({ params }) => {
  if (!params.matchId) {
    throw error(400, 'matchId required');
  }

  throw error(501, 'Lobby breakdown not yet implemented');
};
