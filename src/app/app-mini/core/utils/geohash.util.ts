/**
 * Geohash pure utilities (`app-mini/core/utils`).
 *
 * Mirrors backend `GeohashService` (design.md §11.1) on the client so the map
 * layer can encode points, derive cell bounding boxes, and cover a viewport
 * bbox with geohash cells — all WITHOUT side effects (no I/O, no globals, no
 * randomness). Deterministic and referentially transparent.
 *
 * Supports the design's correctness properties:
 *  - Property 3: Geohash bucket containment + prefix monotonicity (design §13)
 *  - Property 4: Viewport cover — every point of the bbox lies in some cell.
 *
 * _Requirements: 4.1, 4.5, 2.5, 15.1_
 * _Design: 11.1 GeohashService, 13 Property 3 & 4_
 *
 * Single source of truth: precision bounds and the viewport cell cap come from
 * `rls-config.constants` (which mirror the backend params). That file is a
 * dependency-free constants module, so importing it directly keeps this util
 * barrel-independent and side-effect free — safe to exercise from `fast-check`
 * property tests without pulling in Angular/DI.
 */

import { RLS_GEOHASH_PRECISION, RLS_REALTIME } from '../constants/rls-config.constants';

/** Geohash base-32 alphabet (no a, i, l, o — standard geohash encoding). */
export const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Minimum / maximum supported geohash precision (string length).
 * Sourced from {@link RLS_GEOHASH_PRECISION} so client + server agree on the
 * valid precision domain (design §4.1).
 */
export const MIN_PRECISION = RLS_GEOHASH_PRECISION.MIN;
export const MAX_PRECISION = RLS_GEOHASH_PRECISION.MAX;

/**
 * Default cap on the number of geohash cells a single `coverBbox` may return.
 * Mirrors the realtime viewport channel cap (design §3.1): exceeding it signals
 * the caller to drop to a coarser precision (fewer, larger cells).
 */
export const DEFAULT_MAX_CELLS = RLS_REALTIME.MAX_VIEWPORT_CELLS;

/** Valid world coordinate ranges. */
const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

/**
 * Axis-aligned geographic bounding box for a geohash cell or a viewport.
 * Invariant for a well-formed bbox: `minLat <= maxLat` and `minLng <= maxLng`.
 */
export interface GeoBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/** A viewport bounding box. Alias of {@link GeoBounds} for readability. */
export type Bbox = GeoBounds;

// Precompute reverse lookup once (module load, still side-effect free).
const BASE32_INDEX: Readonly<Record<string, number>> = (() => {
  const map: Record<string, number> = {};
  for (let i = 0; i < GEOHASH_BASE32.length; i++) {
    map[GEOHASH_BASE32[i]] = i;
  }
  return map;
})();

/**
 * Encode a `(lat, lng)` point into a geohash string of length `precision`.
 *
 * Pre:  -90 <= lat <= 90, -180 <= lng <= 180, 1 <= precision <= 12 (integer).
 * Post: `result.length === precision`; every char ∈ GEOHASH_BASE32;
 *       the point lies inside `bounds(result)` (containment);
 *       for p2 < p1, `encode(lat,lng,p2)` is a prefix of `encode(lat,lng,p1)`
 *       (prefix monotonicity — guaranteed because each char is produced by the
 *       same deterministic binary subdivision).
 *
 * @throws RangeError when inputs fall outside their valid domain.
 */
export function encode(lat: number, lng: number, precision: number): string {
  assertLatLng(lat, lng);
  assertPrecision(precision);

  let latLow = LAT_MIN;
  let latHigh = LAT_MAX;
  let lngLow = LNG_MIN;
  let lngHigh = LNG_MAX;

  let hash = '';
  let bits = 0;
  let bitCount = 0;
  let evenBit = true; // even bits split longitude first

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngLow + lngHigh) / 2;
      if (lng >= mid) {
        bits = (bits << 1) | 1;
        lngLow = mid;
      } else {
        bits = bits << 1;
        lngHigh = mid;
      }
    } else {
      const mid = (latLow + latHigh) / 2;
      if (lat >= mid) {
        bits = (bits << 1) | 1;
        latLow = mid;
      } else {
        bits = bits << 1;
        latHigh = mid;
      }
    }

    evenBit = !evenBit;
    bitCount++;

    if (bitCount === 5) {
      hash += GEOHASH_BASE32[bits];
      bits = 0;
      bitCount = 0;
    }
  }

  return hash;
}

/**
 * Return the bounding box of a geohash cell.
 *
 * Pre:  `hash` is a non-empty string of GEOHASH_BASE32 characters.
 * Post: the box satisfies `minLat <= maxLat`, `minLng <= maxLng`; the original
 *       point used to produce `hash` via {@link encode} is contained in the box.
 *
 * @throws RangeError when `hash` is empty or contains an invalid character.
 */
export function bounds(hash: string): GeoBounds {
  if (typeof hash !== 'string' || hash.length === 0) {
    throw new RangeError('geohash.bounds: hash must be a non-empty string');
  }

  let latLow = LAT_MIN;
  let latHigh = LAT_MAX;
  let lngLow = LNG_MIN;
  let lngHigh = LNG_MAX;
  let evenBit = true;

  for (let c = 0; c < hash.length; c++) {
    const ch = hash[c];
    const idx = BASE32_INDEX[ch];
    if (idx === undefined) {
      throw new RangeError(`geohash.bounds: invalid character "${ch}" in hash`);
    }

    // Decode the 5 bits of this character, most-significant first.
    for (let n = 4; n >= 0; n--) {
      const bit = (idx >> n) & 1;
      if (evenBit) {
        const mid = (lngLow + lngHigh) / 2;
        if (bit === 1) {
          lngLow = mid;
        } else {
          lngHigh = mid;
        }
      } else {
        const mid = (latLow + latHigh) / 2;
        if (bit === 1) {
          latLow = mid;
        } else {
          latHigh = mid;
        }
      }
      evenBit = !evenBit;
    }
  }

  return { minLat: latLow, minLng: lngLow, maxLat: latHigh, maxLng: lngHigh };
}

/**
 * List the geohash cells (at the given `precision`) whose union covers `bbox`.
 *
 * Geohash cells at a fixed precision form a uniform grid aligned to the world
 * origin, so we compute the covering cell-index range directly and sample each
 * cell's interior center to obtain its geohash. This guarantees full coverage
 * (Property 4): the union of `bounds(cell)` over the result contains every
 * point of the input bbox.
 *
 * Pre:  `bbox` valid (minLat<=maxLat, minLng<=maxLng) within world ranges;
 *       1 <= precision <= 12; maxCells >= 1 (defaults to the realtime viewport
 *       cap {@link DEFAULT_MAX_CELLS}, design §3.1).
 * Post: union of `bounds(hash)` covers the whole input bbox;
 *       `result.length <= maxCells` (otherwise it throws so the caller can
 *       reduce precision, per design §11.1).
 *
 * @throws RangeError on invalid bbox/precision/maxCells.
 * @throws GeohashCoverageError when the cover would exceed `maxCells`.
 */
export function coverBbox(
  bbox: Bbox,
  precision: number,
  maxCells: number = DEFAULT_MAX_CELLS,
): string[] {
  assertBbox(bbox);
  assertPrecision(precision);
  if (!(maxCells >= 1)) {
    throw new RangeError('geohash.coverBbox: maxCells must be >= 1');
  }

  // Clamp the requested bbox to the valid world rectangle.
  const minLat = clamp(bbox.minLat, LAT_MIN, LAT_MAX);
  const maxLat = clamp(bbox.maxLat, LAT_MIN, LAT_MAX);
  const minLng = clamp(bbox.minLng, LNG_MIN, LNG_MAX);
  const maxLng = clamp(bbox.maxLng, LNG_MIN, LNG_MAX);

  // Bit budget: even bits encode longitude, odd bits encode latitude.
  const totalBits = 5 * precision;
  const lngBits = Math.ceil(totalBits / 2);
  const latBits = Math.floor(totalBits / 2);
  const lngCount = 2 ** lngBits;
  const latCount = 2 ** latBits;
  const cellWidth = 360 / lngCount; // degrees of longitude per cell
  const cellHeight = 180 / latCount; // degrees of latitude per cell

  // Covering index ranges (clamped to valid grid indices for the world edges).
  const iMin = clampIndex(Math.floor((minLng - LNG_MIN) / cellWidth), lngCount);
  const iMax = clampIndex(Math.floor((maxLng - LNG_MIN) / cellWidth), lngCount);
  const jMin = clampIndex(Math.floor((minLat - LAT_MIN) / cellHeight), latCount);
  const jMax = clampIndex(Math.floor((maxLat - LAT_MIN) / cellHeight), latCount);

  const cols = iMax - iMin + 1;
  const rows = jMax - jMin + 1;
  const estimate = cols * rows;
  if (estimate > maxCells) {
    throw new GeohashCoverageError(estimate, maxCells, precision);
  }

  const cells = new Set<string>();
  for (let j = jMin; j <= jMax; j++) {
    // Sample the cell-row center to stay safely interior (avoids boundary
    // float ambiguity when encoding).
    const lat = LAT_MIN + (j + 0.5) * cellHeight;
    for (let i = iMin; i <= iMax; i++) {
      const lng = LNG_MIN + (i + 0.5) * cellWidth;
      cells.add(encode(lat, lng, precision));
    }
  }

  return [...cells];
}

/** Thrown by {@link coverBbox} when a cover would exceed the allowed cell cap. */
export class GeohashCoverageError extends RangeError {
  constructor(
    public readonly required: number,
    public readonly maxCells: number,
    public readonly precision: number,
  ) {
    super(
      `geohash.coverBbox: cover needs ${required} cells at precision ${precision} ` +
        `which exceeds maxCells=${maxCells}; reduce precision`,
    );
    this.name = 'GeohashCoverageError';
  }
}

// ── internal helpers (pure) ────────────────────────────────────────────────

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

/** Clamp a grid index into the valid `[0, count - 1]` range. */
function clampIndex(index: number, count: number): number {
  if (index < 0) {
    return 0;
  }
  if (index > count - 1) {
    return count - 1;
  }
  return index;
}

function assertLatLng(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || lat < LAT_MIN || lat > LAT_MAX) {
    throw new RangeError(`geohash: lat must be within [${LAT_MIN}, ${LAT_MAX}], got ${lat}`);
  }
  if (!Number.isFinite(lng) || lng < LNG_MIN || lng > LNG_MAX) {
    throw new RangeError(`geohash: lng must be within [${LNG_MIN}, ${LNG_MAX}], got ${lng}`);
  }
}

function assertPrecision(precision: number): void {
  if (!Number.isInteger(precision) || precision < MIN_PRECISION || precision > MAX_PRECISION) {
    throw new RangeError(
      `geohash: precision must be an integer in [${MIN_PRECISION}, ${MAX_PRECISION}], got ${precision}`,
    );
  }
}

function assertBbox(bbox: Bbox): void {
  if (bbox == null) {
    throw new RangeError('geohash.coverBbox: bbox is required');
  }
  const { minLat, minLng, maxLat, maxLng } = bbox;
  if (![minLat, minLng, maxLat, maxLng].every(Number.isFinite)) {
    throw new RangeError('geohash.coverBbox: bbox values must be finite numbers');
  }
  if (minLat > maxLat || minLng > maxLng) {
    throw new RangeError('geohash.coverBbox: bbox must satisfy minLat<=maxLat and minLng<=maxLng');
  }
}
