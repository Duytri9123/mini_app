/**
 * heatmap-score.util.ts — Pure incremental time-decay heatmap scoring for the
 * app-mini module.
 *
 * Mirrors the backend `HeatmapAggregator` (design §11.2): each bucket keeps a
 * single `(scoreAtRef, refTs)` pair instead of a full event history, giving
 * O(1) updates and O(1) reads. The "hotness" of a cell decays exponentially
 * over time so the map reflects current activity (design §4.2).
 *
 * Decay model (design §4.2):
 *   score(bucket, tNow) = Σ_i  w_i · exp(-λ · (tNow − t_i))
 *   λ = ln(2) / halfLife        (default halfLife = 1800s → 30 min)
 *
 * Incremental update on a new event at tNew (design §11.2 ALGORITHM addEvent):
 *   scoreAtRef' = scoreAtRef · exp(-λ · (tNew − refTs)) + w
 *   refTs'      = tNew
 * Read at tNow (design §11.2 ALGORITHM readScore):
 *   readScore   = scoreAtRef · exp(-λ · (tNow − refTs))
 *
 * The decay constant λ and event weights are sourced from the shared config
 * (`RLS_HEAT_DECAY`, `RLS_HEAT_WEIGHTS`) so the client mirrors the backend
 * exactly (single source of truth, design §4.2 / §11.2).
 *
 * These functions are side-effect free (they return new state, never mutate)
 * so they can be exercised by property-based tests (tasks 2.5 / 2.6):
 *   - Property 1: monotonic time-decay, always `>= 0` (no new events).
 *   - Property 2: add is commutative (order-independent at equal timestamps)
 *                 and additive (readScore at `now` rises by exactly +weight).
 *
 * Requirements: 4.2 (time-decay score), 4.3 (non-negative / monotonic decay),
 * 4.6 (activity never negative), 15.1 (pure, performant client logic).
 *
 * Design: §4.2 Heatmap score with time-decay, §11.2 HeatmapAggregator,
 * §13 Property 1 & 2.
 */

import {
  RLS_HEAT_DECAY,
  RLS_HEAT_WEIGHTS,
  type RlsHeatEventKind,
} from '../constants/rls-config.constants';

/**
 * Default half-life in seconds for an activity contribution (design §4.2).
 * After this many seconds a single event's contribution is halved. Sourced
 * from {@link RLS_HEAT_DECAY} so it stays in lockstep with the backend.
 */
export const DEFAULT_HALF_LIFE_SECONDS = RLS_HEAT_DECAY.HALF_LIFE_SECONDS;

/**
 * Default decay constant `λ = ln(2) / halfLife` (design §4.2). Reads/updates
 * use this unless a caller supplies its own λ (e.g. a PBT generator). Sourced
 * from {@link RLS_HEAT_DECAY} (single source of truth).
 */
export const DEFAULT_LAMBDA = RLS_HEAT_DECAY.LAMBDA;

/**
 * Immutable incremental-decay state for a single heatmap bucket.
 *
 * Invariant: `scoreAtRef >= 0`, therefore `readScore(...) >= 0` for any time.
 */
export interface HeatScoreState {
  /** Accumulated, decayed score evaluated at the reference timestamp `refTs`. */
  readonly scoreAtRef: number;
  /** Reference timestamp (epoch seconds) at which `scoreAtRef` is exact. */
  readonly refTs: number;
}

/**
 * Create an empty bucket state. An empty bucket reads as exactly `0` at any
 * time, matching the backend "missing key → 0" behaviour (design §11.2).
 */
export function createHeatState(): HeatScoreState {
  return { scoreAtRef: 0, refTs: 0 };
}

/**
 * Derive the exponential decay constant `λ = ln(2) / halfLife` (design §4.2).
 *
 * @param halfLifeSeconds Time (seconds) after which a contribution is halved;
 *   must be a positive finite number.
 * @returns The decay constant λ (per second).
 * @throws If `halfLifeSeconds` is not a positive finite number.
 */
export function decayConstant(halfLifeSeconds: number): number {
  if (!Number.isFinite(halfLifeSeconds) || halfLifeSeconds <= 0) {
    throw new Error('halfLifeSeconds must be a positive finite number');
  }
  return Math.LN2 / halfLifeSeconds;
}

/**
 * Multiplicative decay factor `exp(-λ · Δt)` over an elapsed interval.
 *
 * The elapsed interval is clamped to `>= 0`: events are applied (and reads
 * taken) at non-decreasing timestamps per the backend precondition
 * `now >= refTs` (design §11.2). Clamping guarantees the factor is always in
 * `(0, 1]`, so a read can never *amplify* a stored score — keeping `readScore`
 * non-increasing in time and `>= 0` for any input (Property 1).
 *
 * @param elapsedSeconds Elapsed time `now − refTs` in seconds.
 * @param lambda Decay constant (per second).
 * @returns A factor in `(0, 1]`.
 */
function decayFactor(elapsedSeconds: number, lambda: number): number {
  const dt = elapsedSeconds > 0 ? elapsedSeconds : 0;
  return Math.exp(-lambda * dt);
}

/**
 * Add an activity event of `weight` at time `now` to a bucket, returning the
 * new state. Pure: the input `state` is never mutated.
 *
 * The old score is first decayed forward to `now`, then the new weight is
 * added, and `refTs` advances to `now` (design §11.2 ALGORITHM addEvent).
 *
 * Preconditions (per design §11.2):
 *   - `weight >= 0`
 *   - `now >= state.refTs` (events applied in non-decreasing time at the bucket)
 *
 * Because the decay factor is `exp(-λ·(now − refTs))`, the result is
 * algebraically identical to the closed-form sum `Σ w_i·exp(-λ(now − t_i))`,
 * so repeated adds remain commutative and additive regardless of insertion
 * order at equal timestamps (Property 2).
 *
 * @param state  Current bucket state.
 * @param weight Event weight (e.g. check-in=3, post=2, story=2, reaction=1).
 * @param now    Event timestamp in epoch seconds.
 * @param lambda Decay constant; defaults to {@link DEFAULT_LAMBDA}.
 * @returns A new {@link HeatScoreState}.
 */
export function addEvent(
  state: HeatScoreState,
  weight: number,
  now: number,
  lambda: number = DEFAULT_LAMBDA,
): HeatScoreState {
  const decayed = state.scoreAtRef * decayFactor(now - state.refTs, lambda);
  return { scoreAtRef: decayed + weight, refTs: now };
}

/**
 * Add an activity event identified by its kind, using the shared
 * {@link RLS_HEAT_WEIGHTS} table to resolve the weight (design §4.2). This is
 * the convenience entry point for client-side optimistic heat bumps so call
 * sites never hardcode weights.
 *
 * @param state Current bucket state.
 * @param kind  Event kind (`checkin`, `post`, `story`, `reaction`).
 * @param now   Event timestamp in epoch seconds.
 * @param lambda Decay constant; defaults to {@link DEFAULT_LAMBDA}.
 * @returns A new {@link HeatScoreState}.
 */
export function addEventOfKind(
  state: HeatScoreState,
  kind: RlsHeatEventKind,
  now: number,
  lambda: number = DEFAULT_LAMBDA,
): HeatScoreState {
  return addEvent(state, RLS_HEAT_WEIGHTS[kind], now, lambda);
}

/**
 * Read the decayed score of a bucket at time `now` (design §11.2 ALGORITHM
 * readScore). Pure: does not mutate `state`.
 *
 * Properties (Property 1):
 *   - Non-negative: returns `>= 0` for any `now` (since `scoreAtRef >= 0` and
 *     the decay factor is in `(0, 1]`).
 *   - Monotonic decay: with no new events, for `t2 > t1`,
 *     `readScore(state, t2) <= readScore(state, t1)`.
 *
 * An empty bucket (`scoreAtRef === 0`) reads as exactly `0`.
 *
 * @param state  Current bucket state.
 * @param now    Read timestamp in epoch seconds.
 * @param lambda Decay constant; defaults to {@link DEFAULT_LAMBDA}.
 * @returns The decayed score at `now` (>= 0).
 */
export function readScore(
  state: HeatScoreState,
  now: number,
  lambda: number = DEFAULT_LAMBDA,
): number {
  if (state.scoreAtRef === 0) {
    return 0;
  }
  return state.scoreAtRef * decayFactor(now - state.refTs, lambda);
}
