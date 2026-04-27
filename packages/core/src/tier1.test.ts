import { describe, expect, it } from 'vitest';
import { computeTier1 } from './tier1';

describe('computeTier1', () => {
  it('zero games → 0 gap, 200 sigma', () => {
    const r = computeTier1(0, 0);
    expect(r.gapMu).toBe(0);
    expect(r.gapSigma).toBe(200);
    expect(r.sampleSize).toBe(0);
  });

  it('50% winrate → 0 gap regardless of sample size', () => {
    expect(computeTier1(10, 10).gapMu).toBeCloseTo(0);
    expect(computeTier1(50, 50).gapMu).toBeCloseTo(0);
  });

  it('100% winrate over 4 games → positive gap', () => {
    const r = computeTier1(4, 0);
    expect(r.gapMu).toBeGreaterThan(0);
    // K * 0.5 * sqrt(4) = 200 * 0.5 * 2 = 200
    expect(r.gapMu).toBeCloseTo(200);
  });

  it('0% winrate → negative gap (below rank)', () => {
    const r = computeTier1(0, 4);
    expect(r.gapMu).toBeLessThan(0);
    expect(r.gapMu).toBeCloseTo(-200);
  });

  it('sigma floors at 60 regardless of large sample', () => {
    const r = computeTier1(500, 500);
    expect(r.gapSigma).toBeGreaterThanOrEqual(60);
  });

  it('sigma decreases with more games (above the floor)', () => {
    const small = computeTier1(5, 5);
    const large = computeTier1(50, 50);
    expect(large.gapSigma).toBeLessThan(small.gapSigma);
  });

  it('sampleSize equals wins + losses', () => {
    expect(computeTier1(15, 10).sampleSize).toBe(25);
  });
});
