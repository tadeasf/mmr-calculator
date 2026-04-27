import { describe, expect, it } from 'vitest';
import { mmrToRankLabel, rankToMmr } from './conversion';

describe('rankToMmr', () => {
  // Iron
  it('Iron IV 0 LP → 0', () => expect(rankToMmr('IRON', 'IV', 0)).toBe(0));
  it('Iron IV 99 LP → 99', () => expect(rankToMmr('IRON', 'IV', 99)).toBe(99));
  it('Iron III 0 LP → 100', () => expect(rankToMmr('IRON', 'III', 0)).toBe(100));
  it('Iron II 0 LP → 200', () => expect(rankToMmr('IRON', 'II', 0)).toBe(200));
  it('Iron I 0 LP → 300', () => expect(rankToMmr('IRON', 'I', 0)).toBe(300));
  it('Iron I 99 LP → 399', () => expect(rankToMmr('IRON', 'I', 99)).toBe(399));

  // Bronze
  it('Bronze IV 0 LP → 400', () => expect(rankToMmr('BRONZE', 'IV', 0)).toBe(400));
  it('Bronze I 99 LP → 799', () => expect(rankToMmr('BRONZE', 'I', 99)).toBe(799));

  // Silver
  it('Silver IV 0 LP → 800', () => expect(rankToMmr('SILVER', 'IV', 0)).toBe(800));
  it('Silver I 99 LP → 1199', () => expect(rankToMmr('SILVER', 'I', 99)).toBe(1199));

  // Gold
  it('Gold IV 0 LP → 1200', () => expect(rankToMmr('GOLD', 'IV', 0)).toBe(1200));
  it('Gold IV 50 LP → 1250', () => expect(rankToMmr('GOLD', 'IV', 50)).toBe(1250));
  it('Gold I 99 LP → 1599', () => expect(rankToMmr('GOLD', 'I', 99)).toBe(1599));

  // Platinum
  it('Platinum IV 0 LP → 1600', () => expect(rankToMmr('PLATINUM', 'IV', 0)).toBe(1600));
  it('Platinum I 99 LP → 1999', () => expect(rankToMmr('PLATINUM', 'I', 99)).toBe(1999));

  // Emerald
  it('Emerald IV 0 LP → 2000', () => expect(rankToMmr('EMERALD', 'IV', 0)).toBe(2000));
  it('Emerald I 99 LP → 2399', () => expect(rankToMmr('EMERALD', 'I', 99)).toBe(2399));

  // Diamond
  it('Diamond IV 0 LP → 2400', () => expect(rankToMmr('DIAMOND', 'IV', 0)).toBe(2400));
  it('Diamond III 0 LP → 2500', () => expect(rankToMmr('DIAMOND', 'III', 0)).toBe(2500));
  it('Diamond II 0 LP → 2600', () => expect(rankToMmr('DIAMOND', 'II', 0)).toBe(2600));
  it('Diamond I 0 LP → 2700', () => expect(rankToMmr('DIAMOND', 'I', 0)).toBe(2700));
  it('Diamond I 99 LP → 2799', () => expect(rankToMmr('DIAMOND', 'I', 99)).toBe(2799));

  // Apex tiers (division ignored)
  it('Master 0 LP → 2800', () => expect(rankToMmr('MASTER', '', 0)).toBe(2800));
  it('Master 150 LP → 2950', () => expect(rankToMmr('MASTER', '', 150)).toBe(2950));
  it('Grandmaster 200 LP → 3000', () => expect(rankToMmr('GRANDMASTER', '', 200)).toBe(3000));
  it('Challenger 500 LP → 3300', () => expect(rankToMmr('CHALLENGER', '', 500)).toBe(3300));

  // Case insensitive
  it('lowercase tier/division', () =>
    expect(rankToMmr('gold', 'iv', 50)).toBe(rankToMmr('GOLD', 'IV', 50)));

  // Error paths
  it('throws on unknown tier', () => expect(() => rankToMmr('MYTHIC', 'I', 0)).toThrow());
  it('throws on unknown division', () => expect(() => rankToMmr('GOLD', 'V', 0)).toThrow());
});

describe('mmrToRankLabel', () => {
  it('0 → Iron IV', () => expect(mmrToRankLabel(0)).toBe('Iron IV'));
  it('99 → Iron IV', () => expect(mmrToRankLabel(99)).toBe('Iron IV'));
  it('100 → Iron III', () => expect(mmrToRankLabel(100)).toBe('Iron III'));
  it('300 → Iron I', () => expect(mmrToRankLabel(300)).toBe('Iron I'));
  it('400 → Bronze IV', () => expect(mmrToRankLabel(400)).toBe('Bronze IV'));
  it('1200 → Gold IV', () => expect(mmrToRankLabel(1200)).toBe('Gold IV'));
  it('1500 → Gold I', () => expect(mmrToRankLabel(1500)).toBe('Gold I'));
  it('2400 → Diamond IV', () => expect(mmrToRankLabel(2400)).toBe('Diamond IV'));
  it('2700 → Diamond I', () => expect(mmrToRankLabel(2700)).toBe('Diamond I'));
  it('2800 → Master+ 0 LP', () => expect(mmrToRankLabel(2800)).toBe('Master+ 0 LP'));
  it('2950 → Master+ 150 LP', () => expect(mmrToRankLabel(2950)).toBe('Master+ 150 LP'));
});
