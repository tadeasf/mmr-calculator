// Short region codes exposed to users
export type Region =
  | 'na'
  | 'euw'
  | 'eune'
  | 'kr'
  | 'br'
  | 'jp'
  | 'oce'
  | 'ru'
  | 'tr'
  | 'lan'
  | 'las';

// Riot platform routing (league-v4, summoner-v4)
const PLATFORM: Record<Region, string> = {
  na: 'na1',
  euw: 'euw1',
  eune: 'eun1',
  kr: 'kr',
  br: 'br1',
  jp: 'jp1',
  oce: 'oc1',
  ru: 'ru',
  tr: 'tr1',
  lan: 'la1',
  las: 'la2',
};

// Riot regional routing (account-v1, match-v5)
const REGIONAL: Record<Region, string> = {
  na: 'americas',
  euw: 'europe',
  eune: 'europe',
  kr: 'asia',
  br: 'americas',
  jp: 'asia',
  oce: 'sea',
  ru: 'europe',
  tr: 'europe',
  lan: 'americas',
  las: 'americas',
};

export function toPlatform(region: Region): string {
  return PLATFORM[region];
}

export function toRegional(region: Region): string {
  return REGIONAL[region];
}

export function platformHost(region: Region): string {
  return `https://${PLATFORM[region]}.api.riotgames.com`;
}

export function regionalHost(region: Region): string {
  return `https://${REGIONAL[region]}.api.riotgames.com`;
}
