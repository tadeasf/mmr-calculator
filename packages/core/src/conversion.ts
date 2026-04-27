export type Tier =
  | 'IRON'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'EMERALD'
  | 'DIAMOND'
  | 'MASTER'
  | 'GRANDMASTER'
  | 'CHALLENGER';

export type Division = 'I' | 'II' | 'III' | 'IV' | '';

const TIER_BASE: Record<string, number> = {
  IRON: 0,
  BRONZE: 400,
  SILVER: 800,
  GOLD: 1200,
  PLATINUM: 1600,
  EMERALD: 2000,
  DIAMOND: 2400,
  MASTER: 2800,
  GRANDMASTER: 2800,
  CHALLENGER: 2800,
};

const DIVISION_OFFSET: Record<string, number> = {
  IV: 0,
  III: 100,
  II: 200,
  I: 300,
  '': 0,
};

const APEX_TIERS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER']);

// TODO: calibrate apex multiplier against challenger LP-distribution data; 1.0 is a v1 anchor
export function rankToMmr(tier: string, division: string, lp: number): number {
  const t = tier.toUpperCase();
  const base = TIER_BASE[t];
  if (base === undefined) throw new Error(`Unknown tier: ${tier}`);

  if (APEX_TIERS.has(t)) {
    return base + lp;
  }

  const divOffset = DIVISION_OFFSET[division.toUpperCase()];
  if (divOffset === undefined) throw new Error(`Unknown division: ${division}`);

  return base + divOffset + lp;
}

export function mmrToRankLabel(mmr: number): string {
  if (mmr >= 2800) return `Master+ ${mmr - 2800} LP`;
  if (mmr >= 2400) return `Diamond ${divLabel(mmr, 2400)}`;
  if (mmr >= 2000) return `Emerald ${divLabel(mmr, 2000)}`;
  if (mmr >= 1600) return `Platinum ${divLabel(mmr, 1600)}`;
  if (mmr >= 1200) return `Gold ${divLabel(mmr, 1200)}`;
  if (mmr >= 800) return `Silver ${divLabel(mmr, 800)}`;
  if (mmr >= 400) return `Bronze ${divLabel(mmr, 400)}`;
  return `Iron ${divLabel(mmr, 0)}`;
}

function divLabel(mmr: number, base: number): string {
  const offset = mmr - base;
  if (offset >= 300) return 'I';
  if (offset >= 200) return 'II';
  if (offset >= 100) return 'III';
  return 'IV';
}
