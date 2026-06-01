/**
 * Unit tests for RlsStoryService — verifies story creation (24h expiry set by
 * backend), loading nearby active stories with client-side expiry filtering,
 * story map loading, and realtime convergence on `story.expired` /
 * `story.created` deltas (idempotent, Property 9).
 *
 * Uses Angular's HttpClientTestingModule so requests are asserted without a real
 * network, exercising the service through `RlsApiService` (the only HTTP
 * entrypoint), matching production wiring.
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
 */
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { API_URL } from 'src/environments/environment';

import {
  RlsStoryService,
  createdEventToStory,
  filterActiveStories,
  removeStoryById,
  upsertStory,
} from './rls-story.service';
import {
  RlsStory,
  RlsStoryCreatedEvent,
  RlsStoryExpiredEvent,
} from '../interfaces';

const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.parse('2024-01-01T12:00:00Z');

/** Story created `hoursAgo` hours before NOW, expiring 24h after creation. */
function makeStory(overrides: Partial<RlsStory> = {}): RlsStory {
  const createdAt = NOW - HOUR_MS; // 1h ago by default → active
  return {
    id: 1,
    userId: 10,
    mediaUrl: 'https://cdn/s.jpg',
    mediaType: 'image',
    lat: 21.0285,
    lng: 105.8542,
    status: 'active',
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: new Date(createdAt + 24 * HOUR_MS).toISOString(),
    ...overrides,
  };
}

function makeCreatedEvent(
  overrides: Partial<RlsStoryCreatedEvent> = {},
): RlsStoryCreatedEvent {
  return {
    id: 'evt-c1',
    storyId: 99,
    userId: 20,
    mediaUrl: 'https://cdn/new.jpg',
    mediaType: 'image',
    lat: 21.0285,
    lng: 105.8542,
    status: undefined as never, // not part of created event
    expiresAt: new Date(NOW + 20 * HOUR_MS).toISOString(),
    createdAt: new Date(NOW).toISOString(),
    ...overrides,
  } as RlsStoryCreatedEvent;
}

describe('RlsStoryService', () => {
  let service: RlsStoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RlsStoryService],
    });
    service = TestBed.inject(RlsStoryService);
    httpMock = TestBed.inject(HttpTestingController);
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(NOW));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  // ── R8.1 create story ───────────────────────────────────────────────────────
  describe('createStory (R8.1)', () => {
    it('posts to /stories and merges the returned story into map state', () => {
      let result: RlsStory | undefined;
      service
        .createStory({ mediaUrl: 'https://cdn/s.jpg', mediaType: 'image', lat: 21.0285, lng: 105.8542 })
        .subscribe((s) => (result = s));

      const req = httpMock.expectOne(`${API_URL}/stories`);
      expect(req.request.method).toBe('POST');
      req.flush({ data: makeStory({ id: 5 }) });

      expect(result?.id).toBe(5);
      expect(service.getMapStories().map((s) => s.id)).toEqual([5]);
    });

    it('does not merge a story that is already expired on return', () => {
      service
        .createStory({ mediaUrl: 'x', mediaType: 'image', lat: 21, lng: 105 })
        .subscribe();
      // created 25h ago → expired
      const expired = makeStory({ id: 6, createdAt: new Date(NOW - 25 * HOUR_MS).toISOString(), expiresAt: new Date(NOW - HOUR_MS).toISOString() });
      httpMock.expectOne(`${API_URL}/stories`).flush({ data: expired });

      expect(service.getMapStories()).toEqual([]);
    });
  });

  // ── R8.2 / R8.3 load nearby active ──────────────────────────────────────────
  describe('loadNearby (R8.2, R8.3)', () => {
    it('requests nearby with lat/lng/radius and filters expired client-side', () => {
      const active = makeStory({ id: 1 });
      const expired = makeStory({
        id: 2,
        createdAt: new Date(NOW - 25 * HOUR_MS).toISOString(),
        expiresAt: new Date(NOW - HOUR_MS).toISOString(),
      });

      let emitted: RlsStory[] | undefined;
      service
        .loadNearby({ lat: 21.0285, lng: 105.8542, radiusM: 2000 })
        .subscribe((r) => (emitted = r));

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/stories/nearby`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('lat')).toBe('21.0285');
      expect(req.request.params.get('lng')).toBe('105.8542');
      expect(req.request.params.get('radius')).toBe('2000');
      req.flush({ data: [active, expired] });

      expect(emitted!.map((s) => s.id)).toEqual([1]); // expired filtered out
      expect(service.getNearbyStories().map((s) => s.id)).toEqual([1]);
    });
  });

  // ── R8.6 story map ───────────────────────────────────────────────────────────
  describe('loadStoryMap (R8.6)', () => {
    it('requests /stories/map by bbox and filters expired client-side', () => {
      service.loadStoryMap({ bbox: '105.8,21.0,105.9,21.1' }).subscribe();
      const req = httpMock.expectOne((r) => r.url === `${API_URL}/stories/map`);
      expect(req.request.params.get('bbox')).toBe('105.8,21.0,105.9,21.1');
      req.flush({
        data: [
          makeStory({ id: 1 }),
          makeStory({ id: 2, status: 'expired' }),
        ],
      });

      expect(service.getMapStories().map((s) => s.id)).toEqual([1]);
    });
  });

  // ── R8.5 realtime convergence: story.expired ─────────────────────────────────
  describe('applyStoryExpiredDelta (R8.4, R8.5)', () => {
    beforeEach(() => {
      service.loadNearby({ lat: 21.0285, lng: 105.8542, radiusM: 5000 }).subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_URL}/stories/nearby`)
        .flush({ data: [makeStory({ id: 1 }), makeStory({ id: 2 })] });
      service.loadStoryMap({ bbox: 'a' }).subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_URL}/stories/map`)
        .flush({ data: [makeStory({ id: 1 }), makeStory({ id: 2 })] });
    });

    it('removes the expired story from both nearby and map state', () => {
      service.applyStoryExpiredDelta({ id: 'e1', storyId: 2 } as RlsStoryExpiredEvent);
      expect(service.getNearbyStories().map((s) => s.id)).toEqual([1]);
      expect(service.getMapStories().map((s) => s.id)).toEqual([1]);
    });

    it('applies the same expired event id exactly once (Property 9)', () => {
      const evt = { id: 'e1', storyId: 2 } as RlsStoryExpiredEvent;
      service.applyStoryExpiredDelta(evt);
      // re-add story 2, then replay the same event id → must NOT re-remove
      service.applyStoryCreatedDelta(makeCreatedEvent({ id: 'c2', storyId: 2, lat: 21.0285, lng: 105.8542 }));
      service.applyStoryExpiredDelta(evt); // duplicate id, ignored
      expect(service.getMapStories().some((s) => s.id === 2)).toBeTrue();
    });

    it('ignores expired deltas with no event id', () => {
      service.applyStoryExpiredDelta({ id: '', storyId: 1 } as RlsStoryExpiredEvent);
      expect(service.getNearbyStories().map((s) => s.id)).toEqual([1, 2]);
    });
  });

  // ── R8.5 realtime convergence: story.created ─────────────────────────────────
  describe('applyStoryCreatedDelta (R8.5)', () => {
    beforeEach(() => {
      service.loadNearby({ lat: 21.0285, lng: 105.8542, radiusM: 5000 }).subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_URL}/stories/nearby`)
        .flush({ data: [makeStory({ id: 1 })] });
    });

    it('adds a new in-radius story to nearby and map', () => {
      service.applyStoryCreatedDelta(
        makeCreatedEvent({ id: 'c1', storyId: 50, lat: 21.0285, lng: 105.8542 }),
      );
      expect(service.getNearbyStories().map((s) => s.id)).toEqual([50, 1]);
      expect(service.getMapStories().map((s) => s.id)).toEqual([50]);
    });

    it('adds an out-of-radius story to map only (not nearby)', () => {
      service.applyStoryCreatedDelta(
        makeCreatedEvent({ id: 'c2', storyId: 51, lat: 0, lng: 0 }),
      );
      expect(service.getNearbyStories().map((s) => s.id)).toEqual([1]);
      expect(service.getMapStories().map((s) => s.id)).toEqual([51]);
    });

    it('applies the same created event id exactly once (Property 9)', () => {
      const evt = makeCreatedEvent({ id: 'c1', storyId: 50, lat: 21.0285, lng: 105.8542 });
      service.applyStoryCreatedDelta(evt);
      service.applyStoryCreatedDelta(evt);
      service.applyStoryCreatedDelta(evt);
      expect(service.getNearbyStories().filter((s) => s.id === 50).length).toBe(1);
    });
  });

  // ── pure helpers ─────────────────────────────────────────────────────────────
  describe('pure helpers', () => {
    it('filterActiveStories keeps only active stories at now', () => {
      const active = makeStory({ id: 1 });
      const expired = makeStory({
        id: 2,
        expiresAt: new Date(NOW - 1).toISOString(),
      });
      const removed = makeStory({ id: 3, status: 'removed' });
      expect(filterActiveStories([active, expired, removed], NOW).map((s) => s.id)).toEqual([1]);
    });

    it('upsertStory prepends new and replaces existing by id', () => {
      const list = [makeStory({ id: 1 })];
      expect(upsertStory(list, makeStory({ id: 2 })).map((s) => s.id)).toEqual([2, 1]);
      const replaced = upsertStory(list, makeStory({ id: 1, mediaUrl: 'new' }));
      expect(replaced.length).toBe(1);
      expect(replaced[0].mediaUrl).toBe('new');
    });

    it('removeStoryById drops the matching story and keeps reference when absent', () => {
      const list = [makeStory({ id: 1 }), makeStory({ id: 2 })];
      expect(removeStoryById(list, 1).map((s) => s.id)).toEqual([2]);
      expect(removeStoryById(list, 999)).toBe(list);
    });

    it('createdEventToStory maps the realtime payload to an active story', () => {
      const story = createdEventToStory(makeCreatedEvent({ storyId: 7 }));
      expect(story.id).toBe(7);
      expect(story.status).toBe('active');
    });
  });
});
