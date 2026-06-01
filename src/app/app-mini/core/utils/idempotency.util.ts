/**
 * idempotency.util.ts
 *
 * Pure helpers for realtime idempotency on the client.
 *
 * Realtime delivery is **at-least-once**: because of reconnect/replay, the same
 * broadcast event (identified by its `id`) can arrive more than once. To keep
 * rendering correct, the client keeps a bounded **LRU set** of processed event
 * ids and applies each event exactly once.
 *
 * Everything here is implemented as side-effect-free pure functions over
 * immutable values, so it can be validated with property-based tests.
 *
 * Design: design.md §3.3 (At-least-once + idempotent client / LRU set),
 *         §13 Property 9 (Realtime idempotency).
 * Requirements: 3.6 (marker.upserted add/update without full reload),
 *               5.4 (feed.item.created prepend), 12.4 (reconnect reconcile),
 *               15.1 (pure functions in app-mini/core/utils).
 */

import { RLS_REALTIME } from '../constants/rls-config.constants';

/**
 * Default capacity of the processed-id LRU set.
 *
 * Sourced from {@link RLS_REALTIME.IDEMPOTENCY_LRU_SIZE} (single source of
 * truth, design.md §3.1) — large enough to absorb a realistic burst/replay
 * window after a reconnect, while remaining bounded so client memory cannot
 * grow without limit.
 */
export const DEFAULT_LRU_CAPACITY = RLS_REALTIME.IDEMPOTENCY_LRU_SIZE;

/**
 * An immutable, bounded least-recently-used set of event ids.
 *
 * `ids` is ordered from least-recently-used (index 0) to most-recently-used
 * (last index). When the set exceeds `capacity`, the oldest ids are evicted
 * from the front.
 */
export interface LruSet {
  /** Maximum number of ids retained. Always a positive integer. */
  readonly capacity: number;
  /** Processed ids ordered oldest -> newest. */
  readonly ids: readonly string[];
}

/**
 * Application state guarded by idempotency: the reduced domain `value` plus the
 * LRU set of event ids that have already been applied to it.
 *
 * @typeParam S - the shape of the domain/render state being reduced.
 */
export interface IdempotencyState<S> {
  /** The domain/render state produced by applying processed events. */
  readonly value: S;
  /** LRU set of event ids already folded into `value`. */
  readonly processed: LruSet;
}

/**
 * Create an empty LRU set with the given capacity.
 *
 * @param capacity - maximum retained ids (positive integer). Defaults to
 *                   {@link DEFAULT_LRU_CAPACITY}.
 * @throws RangeError if `capacity` is not a positive integer.
 */
export function createLruSet(capacity: number = DEFAULT_LRU_CAPACITY): LruSet {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new RangeError(
      `LRU capacity must be a positive integer, received: ${capacity}`,
    );
  }
  return { capacity, ids: [] };
}

/** Whether `id` is currently tracked in the LRU set. */
export function lruHas(set: LruSet, id: string): boolean {
  return set.ids.includes(id);
}

/** Number of ids currently tracked. */
export function lruSize(set: LruSet): number {
  return set.ids.length;
}

/**
 * Return a new LRU set with `id` marked as most-recently-used.
 *
 * - If `id` is new, it is appended; the oldest id is evicted when capacity is
 *   exceeded.
 * - If `id` is already present, it is moved to the most-recent position
 *   (touch) without growing the set.
 *
 * The input set is never mutated.
 */
export function lruAdd(set: LruSet, id: string): LruSet {
  const withoutId = set.ids.filter((existing) => existing !== id);
  const appended = [...withoutId, id];
  const overflow = appended.length - set.capacity;
  const ids = overflow > 0 ? appended.slice(overflow) : appended;
  return { capacity: set.capacity, ids };
}

/**
 * Create an idempotency-guarded state from an initial domain value.
 *
 * @param value - initial domain/render state.
 * @param capacity - LRU capacity for processed event ids.
 */
export function createIdempotencyState<S>(
  value: S,
  capacity: number = DEFAULT_LRU_CAPACITY,
): IdempotencyState<S> {
  return { value, processed: createLruSet(capacity) };
}

/** Whether an event with `eventId` has already been applied to this state. */
export function hasProcessed<S>(
  state: IdempotencyState<S>,
  eventId: string,
): boolean {
  return lruHas(state.processed, eventId);
}

/**
 * Apply an event to the state exactly once.
 *
 * If `eventId` has already been processed (it is in the LRU set), the state is
 * returned unchanged and `reducer` is NOT invoked. Otherwise `reducer` is
 * applied to the current domain value and `eventId` is recorded in the LRU set.
 *
 * This guarantees Property 9 (realtime idempotency): for a fixed `eventId` and
 * `reducer`, applying the same event any number of times yields the same domain
 * `value` as applying it once.
 *
 *     applyOnce(applyOnce(s, id, r), id, r).value === applyOnce(s, id, r).value
 *
 * `reducer` must be a pure function of the domain value for the idempotency
 * guarantee to hold. The input `state` is never mutated.
 *
 * Note: the LRU set is bounded. If an id is evicted (because more than
 * `capacity` distinct ids were seen since) and the same event is replayed
 * afterwards, it will be applied again. Choose `capacity` to cover the expected
 * reconnect/replay window.
 *
 * @param state - current idempotency-guarded state.
 * @param eventId - unique id carried by the realtime event.
 * @param reducer - pure function producing the next domain value.
 * @returns the next state (or the same `state` reference if already processed).
 */
export function applyOnce<S>(
  state: IdempotencyState<S>,
  eventId: string,
  reducer: (value: S) => S,
): IdempotencyState<S> {
  if (lruHas(state.processed, eventId)) {
    return state;
  }
  return {
    value: reducer(state.value),
    processed: lruAdd(state.processed, eventId),
  };
}
