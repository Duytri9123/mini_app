/**
 * Recommendation ranking — pure, deterministic functions.
 *
 * Backs the Smart Recommendation / Activity Ranking surfaces (design 6.9, 11.7).
 * Phase 1 ranks already-scored candidates; Phase 2 may feed richer signals.
 *
 * Guarantees (verified by PBT task 13.6):
 * - Permutation: the output contains exactly the same candidate references as
 *   the input — nothing added, dropped, or duplicated (Requirement 10.2).
 * - Ordering: sorted by score descending with a deterministic, stable
 *   tie-break on `locationId` ascending (Requirement 10.3).
 * - Determinism: identical inputs always produce identical ordering
 *   (Requirement 10.4).
 * - Score model: combines proximity, time-of-day fit, trend boost, preference
 *   affinity, and novelty (Requirement 10.5).
 *
 * Validates: Requirements 10.2, 10.3, 10.4, 10.5, 11.2, 15.1
 */

/** A location identifier. Locations are expected to have a unique id. */
export type LocationId = string | number;

/**
 * Weights used to combine the recommendation signals into a single score.
 * Weights do not need to sum to 1; ranking only depends on relative ordering.
 */
export interface RankingWeights {
  proximity: number;
  timeOfDay: number;
  trend: number;
  preference: number;
  novelty: number;
}

/** Default signal weights for the Phase 1 ranking model (design 6.9). */
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  proximity: 0.3,
  timeOfDay: 0.2,
  trend: 0.25,
  preference: 0.15,
  novelty: 0.1,
};

/**
 * Context passed to the ranker. `weights` may override any subset of the
 * default weights; omitted entries fall back to {@link DEFAULT_RANKING_WEIGHTS}.
 */
export interface RankingContext {
  weights?: Partial<RankingWeights>;
}

/**
 * A rankable recommendation candidate.
 *
 * Either provide a precomputed `score` (e.g. from the backend RankingService /
 * Redis sorted set) or the individual signals below — in which case the score
 * is derived as a weighted sum (Requirement 10.5). `locationId` is required and
 * is used as the deterministic tie-break key.
 */
export interface RankableCandidate {
  /** Unique location id, used as the stable tie-break key. */
  locationId: LocationId;
  /** Precomputed score. When finite, it takes precedence over the signals. */
  score?: number;
  /** Closeness to the user, higher = nearer. */
  proximity?: number;
  /** How well the place fits the current time of day. */
  timeOfDayFit?: number;
  /** Trend / popularity boost. */
  trendBoost?: number;
  /** Affinity with the user's preferences. */
  preferenceAffinity?: number;
  /** Novelty / discovery bonus for unseen places. */
  novelty?: number;
}

/** Coerce a possibly-missing signal into a finite number (default 0). */
function toSignal(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Coerce a score into a finite value; non-finite scores sort last. */
function sanitizeScore(score: number): number {
  return Number.isFinite(score) ? score : Number.NEGATIVE_INFINITY;
}

/**
 * Deterministic total order on location ids (ascending).
 * Numbers compare numerically; everything else compares by code-point string
 * order so the result never depends on locale.
 */
function compareLocationId(a: LocationId, b: LocationId): number {
  if (typeof a === 'number' && typeof b === 'number') {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  const sa = String(a);
  const sb = String(b);
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

/**
 * Compute the combined recommendation score for a single candidate.
 *
 * A finite, explicitly provided `score` is used as-is; otherwise the score is a
 * weighted sum of the available signals (Requirement 10.5). Pure and
 * deterministic: the same candidate and context always yield the same value.
 */
export function computeRecommendationScore(
  candidate: RankableCandidate,
  ctx: RankingContext = {},
): number {
  if (typeof candidate.score === 'number' && Number.isFinite(candidate.score)) {
    return candidate.score;
  }

  const w: RankingWeights = { ...DEFAULT_RANKING_WEIGHTS, ...(ctx.weights ?? {}) };

  return (
    w.proximity * toSignal(candidate.proximity) +
    w.timeOfDay * toSignal(candidate.timeOfDayFit) +
    w.trend * toSignal(candidate.trendBoost) +
    w.preference * toSignal(candidate.preferenceAffinity) +
    w.novelty * toSignal(candidate.novelty)
  );
}

/**
 * Rank recommendation candidates.
 *
 * Returns a new array that is a permutation of `candidates` (same object
 * references, none added/dropped/duplicated), ordered by score descending with
 * a deterministic, stable tie-break on `locationId` ascending. The input array
 * is never mutated.
 *
 * Validates: Requirements 10.2, 10.3, 10.4, 10.5, 11.2, 15.1
 */
export function rankRecommendations<T extends RankableCandidate>(
  candidates: readonly T[],
  ctx: RankingContext = {},
): T[] {
  if (!candidates || candidates.length <= 1) {
    return candidates ? candidates.slice() : [];
  }

  // Decorate once so the score is computed a single time per candidate and the
  // original index is available as a final, deterministic tie-break.
  const decorated = candidates.map((candidate, index) => ({
    candidate,
    index,
    score: sanitizeScore(computeRecommendationScore(candidate, ctx)),
  }));

  decorated.sort((a, b) => {
    // 1) score descending
    if (a.score < b.score) return 1;
    if (a.score > b.score) return -1;

    // 2) stable tie-break on locationId (ascending)
    const byId = compareLocationId(a.candidate.locationId, b.candidate.locationId);
    if (byId !== 0) return byId;

    // 3) final deterministic fallback for identical (score, locationId) pairs
    return a.index - b.index;
  });

  return decorated.map((d) => d.candidate);
}
