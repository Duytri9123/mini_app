/**
 * Unit tests: Recommendation ranking (ranking.util.ts)
 *
 * Verifies the pure, deterministic ranking helpers that back the Smart
 * Recommendation surface (design 6.9, 11.7):
 *  - permutation of the candidate set (Requirement 10.2)
 *  - sorted by score descending with stable tie-break on locationId (Req 10.3)
 *  - deterministic ordering for identical inputs (Requirement 10.4)
 *  - weighted-sum score model (Requirement 10.5)
 *
 * The exhaustive property-based coverage lives in task 13.6.
 *
 * Validates: Requirements 10.2, 10.3, 10.4, 10.5
 */
import {
  computeRecommendationScore,
  rankRecommendations,
  DEFAULT_RANKING_WEIGHTS,
  RankableCandidate,
} from '../core/utils/ranking.util';

describe('computeRecommendationScore', () => {
  it('uses an explicit finite score as-is, ignoring signals', () => {
    const candidate: RankableCandidate = {
      locationId: 'a',
      score: 42,
      proximity: 999,
    };
    expect(computeRecommendationScore(candidate)).toBe(42);
  });

  it('falls back to a weighted sum of signals when score is absent (Req 10.5)', () => {
    const candidate: RankableCandidate = {
      locationId: 'a',
      proximity: 1,
      timeOfDayFit: 1,
      trendBoost: 1,
      preferenceAffinity: 1,
      novelty: 1,
    };
    const w = DEFAULT_RANKING_WEIGHTS;
    const expected =
      w.proximity + w.timeOfDay + w.trend + w.preference + w.novelty;
    expect(computeRecommendationScore(candidate)).toBeCloseTo(expected, 12);
  });

  it('treats missing/non-finite signals as 0', () => {
    const candidate: RankableCandidate = {
      locationId: 'a',
      proximity: Number.NaN,
      novelty: 5,
    };
    expect(computeRecommendationScore(candidate)).toBeCloseTo(
      DEFAULT_RANKING_WEIGHTS.novelty * 5,
      12,
    );
  });

  it('respects weight overrides from context', () => {
    const candidate: RankableCandidate = { locationId: 'a', trendBoost: 10 };
    const score = computeRecommendationScore(candidate, {
      weights: { trend: 1 },
    });
    expect(score).toBe(10);
  });
});

describe('rankRecommendations', () => {
  it('returns an empty array for empty input', () => {
    expect(rankRecommendations([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input: RankableCandidate[] = [
      { locationId: 'a', score: 1 },
      { locationId: 'b', score: 2 },
    ];
    const snapshot = [...input];
    rankRecommendations(input);
    expect(input).toEqual(snapshot);
  });

  it('sorts by score descending (Req 10.3)', () => {
    const input: RankableCandidate[] = [
      { locationId: 'a', score: 1 },
      { locationId: 'b', score: 3 },
      { locationId: 'c', score: 2 },
    ];
    const ranked = rankRecommendations(input);
    expect(ranked.map((c) => c.locationId)).toEqual(['b', 'c', 'a']);
  });

  it('is a permutation: same references, none added/dropped/duplicated (Req 10.2)', () => {
    const input: RankableCandidate[] = [
      { locationId: 'a', score: 1 },
      { locationId: 'b', score: 3 },
      { locationId: 'c', score: 2 },
      { locationId: 'd', score: 3 },
    ];
    const ranked = rankRecommendations(input);
    expect(ranked.length).toBe(input.length);
    // every input reference appears exactly once
    for (const item of input) {
      expect(ranked.filter((r) => r === item).length).toBe(1);
    }
  });

  it('breaks ties on locationId ascending (Req 10.3)', () => {
    const input: RankableCandidate[] = [
      { locationId: 'z', score: 5 },
      { locationId: 'a', score: 5 },
      { locationId: 'm', score: 5 },
    ];
    const ranked = rankRecommendations(input);
    expect(ranked.map((c) => c.locationId)).toEqual(['a', 'm', 'z']);
  });

  it('compares numeric locationIds numerically, not lexicographically', () => {
    const input: RankableCandidate[] = [
      { locationId: 10, score: 1 },
      { locationId: 2, score: 1 },
      { locationId: 1, score: 1 },
    ];
    const ranked = rankRecommendations(input);
    expect(ranked.map((c) => c.locationId)).toEqual([1, 2, 10]);
  });

  it('is deterministic: identical inputs produce identical ordering (Req 10.4)', () => {
    const build = (): RankableCandidate[] => [
      { locationId: 'b', score: 2 },
      { locationId: 'a', score: 2 },
      { locationId: 'c', score: 5 },
      { locationId: 'd', score: 1 },
    ];
    const first = rankRecommendations(build()).map((c) => c.locationId);
    const second = rankRecommendations(build()).map((c) => c.locationId);
    expect(first).toEqual(second);
    expect(first).toEqual(['c', 'a', 'b', 'd']);
  });

  it('orders non-finite scores last', () => {
    const input: RankableCandidate[] = [
      { locationId: 'a', score: Number.NaN },
      { locationId: 'b', score: 1 },
    ];
    const ranked = rankRecommendations(input);
    expect(ranked.map((c) => c.locationId)).toEqual(['b', 'a']);
  });

  it('returns a single-element list unchanged', () => {
    const input: RankableCandidate[] = [{ locationId: 'solo', score: 7 }];
    const ranked = rankRecommendations(input);
    expect(ranked).toEqual(input);
    expect(ranked).not.toBe(input); // new array
  });
});
