import type { PageLoad } from './$types';

export const load: PageLoad = ({ params, url }) => {
  const slug = params.slug;
  const hashIdx = slug.lastIndexOf('-');
  return {
    region: params.region,
    riotId: decodeURIComponent(slug.slice(0, hashIdx)),
    tag: decodeURIComponent(slug.slice(hashIdx + 1)),
    queue: url.searchParams.get('queue') ?? 'solo',
  };
};
