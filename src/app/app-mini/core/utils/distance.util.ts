/**
 * distance.util.ts — Pure geospatial distance helpers for the app-mini module.
 *
 * These functions back the client-side "nearby" experience (trending/nearby
 * panels) and mirror the backend GeospatialQueryService.nearby() algorithm
 * (design 11.3). They are side-effect free so they can be exercised by
 * property-based tests (task 13.2 — Property 6: Nearby distance correctness).
 *
 * Requirements: 6.2 (only include spots within radius), 6.3 (distance is
 * non-negative and symmetric), 15.1 (pure, performant client logic).
 *
 * Design: 11.3 GeospatialQueryService (nearby), 13 Property 6.
 */

/** Mean Earth radius in metres (WGS-84 spherical approximation). */
export const EARTH_RADIUS_M = 6_371_000;

/** A geographic coordinate. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** A point paired with its computed distance (metres) from a query centre. */
export interface PointWithDistance<T> {
  point: T;
  distanceM: number;
}

/** Convert degrees to radians. */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance between two coordinates using the haversine formula.
 *
 * Properties (validated by Property 6):
 * - Non-negative: the result is always >= 0.
 * - Symmetric: haversine(a, b) === haversine(b, a).
 * - Identity: distance from a point to itself is 0.
 *
 * @returns Distance in metres.
 *
 * Requirements: 6.2, 6.3
 */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dPhi = toRadians(lat2 - lat1);
  const dLambda = toRadians(lng2 - lng1);

  const sinDPhi = Math.sin(dPhi / 2);
  const sinDLambda = Math.sin(dLambda / 2);

  const a =
    sinDPhi * sinDPhi +
    Math.cos(phi1) * Math.cos(phi2) * sinDLambda * sinDLambda;

  // Clamp to [0, 1] to guard against floating-point overshoot before sqrt/asin.
  const clamped = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));

  // Math.abs guarantees the non-negativity invariant even under rounding.
  return Math.abs(EARTH_RADIUS_M * c);
}

/**
 * Filter a set of points to those within `radiusM` of `center`, returning each
 * surviving point annotated with its distance and sorted by non-decreasing
 * distance.
 *
 * Mirrors the backend nearby() algorithm (design 11.3) and supports Property 6:
 * - soundness:    every returned item has distanceM <= radiusM
 * - sortedness:   results are ordered by non-decreasing distance
 * - completeness: every input point within the radius is present in the result
 *
 * A non-positive or non-finite `radiusM` yields an empty result.
 *
 * Requirements: 6.2, 6.3, 15.1
 */
export function filterWithinRadius<T extends LatLng>(
  center: LatLng,
  points: readonly T[],
  radiusM: number,
): PointWithDistance<T>[] {
  if (!Number.isFinite(radiusM) || radiusM <= 0) {
    return [];
  }

  const within: PointWithDistance<T>[] = [];

  for (const point of points) {
    const distanceM = haversine(center.lat, center.lng, point.lat, point.lng);
    if (distanceM <= radiusM) {
      within.push({ point, distanceM });
    }
  }

  // Sortedness invariant: non-decreasing by distance.
  within.sort((a, b) => a.distanceM - b.distanceM);

  return within;
}
