export interface Tier1Result {
  gapMu: number;
  gapSigma: number;
  sampleSize: number;
}

// 200 MMR per 0.1 winrate deviation at full sample size
const K = 200;
const SIGMA_MIN = 60;

// TODO: replace with true LP-delta inversion once ≥7 days of mmr_snapshots exist for the puuid
export function computeTier1(wins: number, losses: number): Tier1Result {
  const n = wins + losses;
  if (n === 0) {
    return { gapMu: 0, gapSigma: 200, sampleSize: 0 };
  }

  const winrate = wins / n;
  const gapMu = K * (winrate - 0.5) * Math.sqrt(n);
  const gapSigma = Math.max(SIGMA_MIN, 200 / Math.sqrt(n));

  return { gapMu, gapSigma, sampleSize: n };
}
