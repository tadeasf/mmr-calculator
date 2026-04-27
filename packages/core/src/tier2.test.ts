import { describe, expect, it } from 'vitest';
import { computeLobbyMmr, computeTier2, recencyWeight } from './tier2';

describe('recencyWeight', () => {
  it('today → weight 1.0', () => expect(recencyWeight(0)).toBeCloseTo(1.0));
  it('14 days → weight exp(-1) ≈ 0.368', () =>
    expect(recencyWeight(14)).toBeCloseTo(Math.exp(-1), 3));
  it('28 days → weight exp(-2) ≈ 0.135', () =>
    expect(recencyWeight(28)).toBeCloseTo(Math.exp(-2), 3));
  it('weight is always positive', () => expect(recencyWeight(100)).toBeGreaterThan(0));
});

describe('computeLobbyMmr', () => {
  it('pure opponents → average of their MMRs (weighted by 0.6 each, equal weight)', () => {
    const participants = [
      { currentMmr: 1000, isOpponent: true },
      { currentMmr: 2000, isOpponent: true },
    ];
    expect(computeLobbyMmr(participants)).toBeCloseTo(1500);
  });

  it('opponents outweigh teammates', () => {
    // one opponent at 2000, one teammate at 1000
    const participants = [
      { currentMmr: 2000, isOpponent: true },
      { currentMmr: 1000, isOpponent: false },
    ];
    const result = computeLobbyMmr(participants);
    // weighted: (2000*0.6 + 1000*0.4) / (0.6+0.4) = 1600
    expect(result).toBeCloseTo(1600);
  });

  it('empty participants → 0', () => {
    expect(computeLobbyMmr([])).toBe(0);
  });
});

describe('computeTier2', () => {
  it('no lobbies → null', () => {
    expect(computeTier2([])).toBeNull();
  });

  it('single lobby → mu equals that lobby MMR', () => {
    const r = computeTier2([
      {
        participants: [{ currentMmr: 1500, isOpponent: true }],
        daysAgo: 0,
      },
    ]);
    expect(r?.mu).toBeCloseTo(1500);
    expect(r?.lobbiesUsed).toBe(1);
  });

  it('recent games weighted more than old games', () => {
    // lobby0 (today) = 2000, lobby1 (28 days ago) = 1000
    const r = computeTier2([
      { participants: [{ currentMmr: 2000, isOpponent: true }], daysAgo: 0 },
      { participants: [{ currentMmr: 1000, isOpponent: true }], daysAgo: 28 },
    ]);
    // recent weight >> old weight so mu should be closer to 2000
    expect(r?.mu).toBeGreaterThan(1500);
  });

  it('sigma > 0 with varied lobbies', () => {
    const r = computeTier2([
      { participants: [{ currentMmr: 1000, isOpponent: true }], daysAgo: 0 },
      { participants: [{ currentMmr: 2000, isOpponent: true }], daysAgo: 1 },
    ]);
    expect(r?.sigma).toBeGreaterThan(0);
  });
});
