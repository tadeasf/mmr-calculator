export interface Estimate {
  mu: number;
  sigma: number;
}

export interface CombinedEstimate {
  mu: number;
  sigma: number;
  ci90Low: number;
  ci90High: number;
}

// irreducible noise floor — never claim tighter precision than this
const SIGMA_FLOOR = 40;
const Z_90 = 1.645;

export function combineEstimates(e1: Estimate | null, e2: Estimate | null): CombinedEstimate {
  if (!e1 && !e2) throw new Error('At least one estimate required');

  if (!e1 || !e2) {
    const single = (e1 ?? e2) as Estimate;
    return toResult(single.mu, single.sigma);
  }

  const w1 = 1 / e1.sigma ** 2;
  const w2 = 1 / e2.sigma ** 2;
  const mu = (w1 * e1.mu + w2 * e2.mu) / (w1 + w2);
  const sigma = Math.sqrt(1 / (w1 + w2));
  return toResult(mu, sigma);
}

function toResult(mu: number, rawSigma: number): CombinedEstimate {
  const sigma = Math.max(SIGMA_FLOOR, rawSigma);
  return { mu, sigma, ci90Low: mu - Z_90 * sigma, ci90High: mu + Z_90 * sigma };
}
