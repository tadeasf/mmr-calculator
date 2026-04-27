import { describe, expect, it } from 'vitest';
import { combineEstimates } from './combine';

describe('combineEstimates', () => {
  it('throws when both estimates are null', () => {
    expect(() => combineEstimates(null, null)).toThrow();
  });

  it('falls back to e1 when e2 is null', () => {
    const r = combineEstimates({ mu: 1500, sigma: 80 }, null);
    expect(r.mu).toBeCloseTo(1500);
  });

  it('falls back to e2 when e1 is null', () => {
    const r = combineEstimates(null, { mu: 1800, sigma: 60 });
    expect(r.mu).toBeCloseTo(1800);
  });

  it('equal-sigma inputs → average of mus', () => {
    const r = combineEstimates({ mu: 1000, sigma: 100 }, { mu: 2000, sigma: 100 });
    expect(r.mu).toBeCloseTo(1500);
  });

  it('low-sigma input gets more weight', () => {
    // e1 sigma=50 (confident), e2 sigma=200 (uncertain)
    const r = combineEstimates({ mu: 1000, sigma: 50 }, { mu: 2000, sigma: 200 });
    // mu should be much closer to 1000
    expect(r.mu).toBeCloseTo((1000 / 2500 + 2000 / 40000) / (1 / 2500 + 1 / 40000), 0);
    expect(r.mu).toBeLessThan(1200);
  });

  it('combined sigma is less than either individual sigma', () => {
    const e1 = { mu: 1500, sigma: 100 };
    const e2 = { mu: 1500, sigma: 80 };
    const r = combineEstimates(e1, e2);
    expect(r.sigma).toBeLessThan(Math.min(e1.sigma, e2.sigma));
  });

  it('sigma floors at 40', () => {
    // very confident estimates should still floor at 40
    const r = combineEstimates({ mu: 1500, sigma: 10 }, { mu: 1500, sigma: 10 });
    expect(r.sigma).toBeGreaterThanOrEqual(40);
  });

  it('ci90 spans mu ± 1.645*sigma', () => {
    const r = combineEstimates({ mu: 1500, sigma: 60 }, null);
    expect(r.ci90Low).toBeCloseTo(r.mu - 1.645 * r.sigma, 1);
    expect(r.ci90High).toBeCloseTo(r.mu + 1.645 * r.sigma, 1);
  });
});
