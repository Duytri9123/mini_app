/**
 * Unit tests for RlsTrendingService — verifies it serves cached backend trending
 * results (nearby hot/viral spots + top hot places) without re-ranking, exposes
 * them via BehaviorSubject state, and guarantees every spot carries a valid
 * reason (crowded/viral/event/rising) for the presentation layer.
 *
 * Uses Angular's HttpClientTestingModule so requests are asserted without a real
 * network. The service is exercised through `RlsApiService` (the only HTTP
 * entrypoint), matching production wiring.
 *
 * _Requirements: 6.1, 6.4, 6.5, 11.2_
 */
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { API_URL } from 'src/environments/environment';

import {
  RlsTrendingService,
  ensureReason,
  normalizeTrending,
} from './rls-trending.service';
import { RlsApiEnvelope, RlsTrendingPlace } from '../interfaces';

function makePlace(overrides: Partial<RlsTrendingPlace> = {}): RlsTrendingPlace {
  return {
    id: 1,
    name: 'Cafe Trend',
    category: 'cafe',
    lat: 21.02,
    lng: 105.85,
    reason: 'crowded',
    ...overrides,
  };
}

describe('RlsTrendingService', () => {
  let service: RlsTrendingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RlsTrendingService],
    });
    service = TestBed.inject(RlsTrendingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  // ── R6.1 nearby trending ────────────────────────────────────────────────────
  describe('loadNearby (GET /trending/nearby, R6.1)', () => {
    it('requests nearby trending by center and emits cached results in order', () => {
      const data = [
        makePlace({ id: 1, reason: 'crowded', rank: 1 }),
        makePlace({ id: 2, reason: 'viral', rank: 2 }),
      ];
      let emitted: RlsTrendingPlace[] | undefined;
      service.loadNearby({ lat: 21.02, lng: 105.85 }).subscribe((r) => (emitted = r));

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/trending/nearby`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('lat')).toBe('21.02');
      expect(req.request.params.get('lng')).toBe('105.85');
      req.flush({ data } as RlsApiEnvelope<RlsTrendingPlace[]>);

      // backend order preserved (no client re-ranking)
      expect(emitted?.map((p) => p.id)).toEqual([1, 2]);
      expect(service.getNearby().map((p) => p.id)).toEqual([1, 2]);
    });

    it('forwards optional radius and limit params', () => {
      service
        .loadNearby({ lat: 1, lng: 2, radiusM: 1500, limit: 10 })
        .subscribe();
      const req = httpMock.expectOne((r) => r.url === `${API_URL}/trending/nearby`);
      expect(req.request.params.get('radius')).toBe('1500');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush({ data: [] });
    });

    it('toggles loading$ around the request', () => {
      const seen: boolean[] = [];
      service.loading$.subscribe((v) => seen.push(v));
      service.loadNearby({ lat: 1, lng: 2 }).subscribe();
      httpMock.expectOne((r) => r.url === `${API_URL}/trending/nearby`).flush({ data: [] });
      expect(seen).toContain(true);
      expect(seen[seen.length - 1]).toBeFalse();
    });

    it('clears loading$ on error', () => {
      service.loadNearby({ lat: 1, lng: 2 }).subscribe({ error: () => undefined });
      httpMock
        .expectOne((r) => r.url === `${API_URL}/trending/nearby`)
        .flush('boom', { status: 500, statusText: 'Server Error' });
      expect(service.loading$.getValue()).toBeFalse();
    });
  });

  // ── R11.2 top hot places ────────────────────────────────────────────────────
  describe('loadPlaces (GET /trending/places, R11.2)', () => {
    it('requests top hot places by scope and emits cached ranking', () => {
      const data = [makePlace({ id: 5, reason: 'rising', rank: 1 })];
      let emitted: RlsTrendingPlace[] | undefined;
      service.loadPlaces({ scope: 'city' }).subscribe((r) => (emitted = r));

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/trending/places`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('scope')).toBe('city');
      req.flush({ data } as RlsApiEnvelope<RlsTrendingPlace[]>);

      expect(emitted?.map((p) => p.id)).toEqual([5]);
      expect(service.getPlaces().map((p) => p.id)).toEqual([5]);
    });

    it('works with no query (omits scope param)', () => {
      service.loadPlaces().subscribe();
      const req = httpMock.expectOne((r) => r.url === `${API_URL}/trending/places`);
      expect(req.request.params.has('scope')).toBeFalse();
      req.flush({ data: [] });
    });
  });

  // ── reset ───────────────────────────────────────────────────────────────────
  it('reset clears both nearby and places state', () => {
    service.loadNearby({ lat: 1, lng: 2 }).subscribe();
    httpMock
      .expectOne((r) => r.url === `${API_URL}/trending/nearby`)
      .flush({ data: [makePlace({ id: 1 })] });
    expect(service.getNearby().length).toBe(1);

    service.reset();
    expect(service.getNearby()).toEqual([]);
    expect(service.getPlaces()).toEqual([]);
  });

  // ── pure helpers ──────────────────────────────────────────────────────────────
  describe('pure helpers', () => {
    it('normalizeTrending returns [] for non-array input', () => {
      expect(normalizeTrending(null)).toEqual([]);
      expect(normalizeTrending(undefined)).toEqual([]);
    });

    it('normalizeTrending drops nullish entries and keeps order', () => {
      const input = [
        makePlace({ id: 1, reason: 'event' }),
        null as unknown as RlsTrendingPlace,
        makePlace({ id: 2, reason: 'viral' }),
      ];
      expect(normalizeTrending(input).map((p) => p.id)).toEqual([1, 2]);
    });

    it('ensureReason keeps a valid reason untouched', () => {
      const place = makePlace({ reason: 'event' });
      expect(ensureReason(place)).toBe(place);
    });

    it('ensureReason falls back to rising for missing/invalid reason (R6.4)', () => {
      const bad = makePlace({ reason: 'sus' as unknown as RlsTrendingPlace['reason'] });
      expect(ensureReason(bad).reason).toBe('rising');
    });

    it('normalizeTrending guarantees every spot has a valid reason (R6.4)', () => {
      const input = [
        makePlace({ id: 1, reason: undefined as unknown as RlsTrendingPlace['reason'] }),
        makePlace({ id: 2, reason: 'crowded' }),
      ];
      const out = normalizeTrending(input);
      expect(out.every((p) => ['crowded', 'viral', 'event', 'rising'].includes(p.reason))).toBeTrue();
    });
  });
});
