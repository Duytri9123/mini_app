/**
 * Unit tests for distance.util.ts — verifies specific examples and edge cases
 * for the pure geospatial distance helpers.
 *
 * Property-based coverage (Property 6: Nearby distance correctness) lives in the
 * dedicated fast-check suite (task 13.2). These unit tests assert concrete,
 * easy-to-reason-about cases plus boundary conditions.
 */
import {
  EARTH_RADIUS_M,
  filterWithinRadius,
  haversine,
  LatLng,
} from './distance.util';

describe('distance.util', () => {
  describe('haversine', () => {
    it('returns 0 for identical coordinates', () => {
      expect(haversine(10.762622, 106.660172, 10.762622, 106.660172)).toBe(0);
    });

    it('is non-negative', () => {
      expect(haversine(0, 0, 0, 1)).toBeGreaterThanOrEqual(0);
      expect(haversine(-33.8688, 151.2093, 40.7128, -74.006)).toBeGreaterThanOrEqual(0);
    });

    it('is symmetric: haversine(a,b) === haversine(b,a)', () => {
      const ab = haversine(10.762622, 106.660172, 21.027763, 105.83416);
      const ba = haversine(21.027763, 105.83416, 10.762622, 106.660172);
      expect(ab).toBeCloseTo(ba, 6);
    });

    it('approximates a known distance (HCMC <-> Hanoi ~1140km)', () => {
      const d = haversine(10.762622, 106.660172, 21.027763, 105.83416);
      // Great-circle distance is roughly 1140 km; allow a generous tolerance.
      expect(d).toBeGreaterThan(1_130_000);
      expect(d).toBeLessThan(1_160_000);
    });

    it('quarter meridian is ~ (pi/2) * R', () => {
      const d = haversine(0, 0, 90, 0);
      expect(d).toBeCloseTo((Math.PI / 2) * EARTH_RADIUS_M, 0);
    });
  });

  describe('filterWithinRadius', () => {
    const center: LatLng = { lat: 0, lng: 0 };

    interface Place extends LatLng {
      id: string;
    }

    const places: Place[] = [
      { id: 'origin', lat: 0, lng: 0 },
      { id: 'near', lat: 0, lng: 0.001 }, // ~111 m east
      { id: 'mid', lat: 0, lng: 0.01 }, // ~1.11 km east
      { id: 'far', lat: 0, lng: 1 }, // ~111 km east
    ];

    it('soundness: every returned item is within the radius', () => {
      const radiusM = 2_000;
      const result = filterWithinRadius(center, places, radiusM);
      for (const r of result) {
        expect(r.distanceM).toBeLessThanOrEqual(radiusM);
      }
    });

    it('sortedness: results are ordered by non-decreasing distance', () => {
      const result = filterWithinRadius(center, places, 200_000);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].distanceM).toBeGreaterThanOrEqual(result[i - 1].distanceM);
      }
    });

    it('completeness: includes every point within the radius', () => {
      const radiusM = 2_000; // includes origin, near, mid; excludes far
      const result = filterWithinRadius(center, places, radiusM);
      const ids = result.map((r) => r.point.id);
      expect(ids).toContain('origin');
      expect(ids).toContain('near');
      expect(ids).toContain('mid');
      expect(ids).not.toContain('far');
    });

    it('annotates the surviving points with their distance', () => {
      const result = filterWithinRadius(center, places, 200_000);
      const origin = result.find((r) => r.point.id === 'origin');
      expect(origin?.distanceM).toBe(0);
    });

    it('returns an empty array for a non-positive radius', () => {
      expect(filterWithinRadius(center, places, 0)).toEqual([]);
      expect(filterWithinRadius(center, places, -100)).toEqual([]);
    });

    it('returns an empty array for a non-finite radius', () => {
      expect(filterWithinRadius(center, places, Number.NaN)).toEqual([]);
      expect(filterWithinRadius(center, places, Number.POSITIVE_INFINITY)).toEqual([]);
    });

    it('returns an empty array when no points are supplied', () => {
      expect(filterWithinRadius(center, [], 1_000)).toEqual([]);
    });

    it('does not mutate the input points array', () => {
      const snapshot = [...places];
      filterWithinRadius(center, places, 200_000);
      expect(places).toEqual(snapshot);
    });
  });
});
