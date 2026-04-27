export interface LobbyParticipant {
  currentMmr: number;
  isOpponent: boolean;
}

export interface LobbyGame {
  participants: LobbyParticipant[];
  daysAgo: number;
}

export interface Tier2Result {
  mu: number;
  sigma: number;
  lobbiesUsed: number;
}

// TODO: calibrate opponent vs teammate weights against measured data
const OPPONENT_WEIGHT = 0.6;
const TEAMMATE_WEIGHT = 0.4;
// exponential recency decay: weight = exp(-daysAgo / HALF_LIFE)
const HALF_LIFE_DAYS = 14;

export function recencyWeight(daysAgo: number): number {
  return Math.exp(-daysAgo / HALF_LIFE_DAYS);
}

export function computeLobbyMmr(participants: LobbyParticipant[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const p of participants) {
    const w = p.isOpponent ? OPPONENT_WEIGHT : TEAMMATE_WEIGHT;
    weightedSum += p.currentMmr * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

export function computeTier2(lobbies: LobbyGame[]): Tier2Result | null {
  if (lobbies.length === 0) return null;

  const mmrs = lobbies.map((g) => computeLobbyMmr(g.participants));
  const weights = lobbies.map((g) => recencyWeight(g.daysAgo));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const mu = mmrs.reduce((sum, m, i) => sum + m * weights[i], 0) / totalWeight;

  const variance = mmrs.reduce((sum, m, i) => sum + weights[i] * (m - mu) ** 2, 0) / totalWeight;

  // effective sample size for weighted average
  const sumW2 = weights.reduce((s, w) => s + w * w, 0);
  const effectiveN = totalWeight ** 2 / sumW2;

  const sigma = Math.sqrt(variance / effectiveN);

  return { mu, sigma, lobbiesUsed: lobbies.length };
}
