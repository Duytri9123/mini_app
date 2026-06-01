/**
 * Unit tests for RlsNotificationService — verifies cursor-paginated inbox
 * loading, idempotent realtime prepend of `.NotificationReceived` deltas from
 * `RlsRealtimeService.notification$` with unread-count maintenance, and
 * optimistic mark-read / mark-all-read with rollback.
 *
 * Uses Angular's HttpClientTestingModule so requests are asserted without a real
 * network. The service is exercised through `RlsApiService` (the only HTTP
 * entrypoint), and a recording stand-in for `RlsRealtimeService` exposes a
 * `notification$` Subject so realtime deltas can be fired into the service —
 * matching production wiring (loose coupling via the public stream).
 *
 * _Requirements: 9.1, 9.2, 9.5_
 */
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { API_URL } from 'src/environments/environment';

import {
  RlsNotificationService,
  eventToNotification,
  extractNotificationId,
  prependNotificationUnique,
  readUnreadFromMeta,
} from './rls-notification.service';
import { RlsRealtimeService } from './rls-realtime.service';
import {
  RlsApiEnvelope,
  RlsNotification,
  RlsNotificationEvent,
} from '../interfaces';

function makeNotification(overrides: Partial<RlsNotification> = {}): RlsNotification {
  return {
    id: 1,
    userId: 10,
    type: 'friend_checkin',
    title: 'Bạn của bạn vừa check-in',
    body: 'Mai vừa check-in tại Highlands',
    data: { locationId: 5 },
    geohash6: null,
    isRead: false,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<RlsNotificationEvent> = {}): RlsNotificationEvent {
  return {
    id: 'evt-1',
    type: 'hot_area',
    title: 'Khu vực đang nóng',
    body: 'Hồ Gươm đang rất đông',
    data: {},
    createdAt: '2024-01-02T00:00:00Z',
    ...overrides,
  };
}

describe('RlsNotificationService', () => {
  let service: RlsNotificationService;
  let httpMock: HttpTestingController;
  let notification$: Subject<RlsNotificationEvent>;

  beforeEach(() => {
    notification$ = new Subject<RlsNotificationEvent>();
    const realtimeStub = { notification$ } as unknown as RlsRealtimeService;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        RlsNotificationService,
        { provide: RlsRealtimeService, useValue: realtimeStub },
      ],
    });
    service = TestBed.inject(RlsNotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  // ── R9.1 cursor-paginated inbox ─────────────────────────────────────────────
  describe('loadInbox / loadMore (cursor pagination, R9.1)', () => {
    it('loads the first page, tracks the cursor and counts unread', () => {
      const page1 = [
        makeNotification({ id: 1, isRead: false }),
        makeNotification({ id: 2, isRead: true }),
        makeNotification({ id: 3, isRead: false }),
      ];
      let emitted: RlsNotification[] | undefined;
      service.loadInbox({ limit: 20 }).subscribe((r) => (emitted = r));

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/notifications`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('20');
      req.flush({ data: page1, meta: { nextCursor: 'cur-2' } } as RlsApiEnvelope<RlsNotification[]>);

      expect(emitted).toEqual(page1);
      expect(service.getNotifications()).toEqual(page1);
      expect(service.hasMore()).toBeTrue();
      expect(service.getNextCursor()).toBe('cur-2');
      // two unread items in the page
      expect(service.getUnreadCount()).toBe(2);
    });

    it('prefers meta.unreadCount when the backend provides it', () => {
      service.loadInbox().subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_URL}/notifications`)
        .flush({ data: [makeNotification({ id: 1, isRead: false })], meta: { unreadCount: 7 } });

      expect(service.getUnreadCount()).toBe(7);
    });

    it('appends the next page using the stored cursor and dedupes by id', () => {
      service.loadInbox().subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_URL}/notifications`)
        .flush({ data: [makeNotification({ id: 1 })], meta: { nextCursor: 'cur-2' } });

      service.loadMore().subscribe();
      const req2 = httpMock.expectOne((r) => r.url === `${API_URL}/notifications`);
      expect(req2.request.params.get('cursor')).toBe('cur-2');
      req2.flush({ data: [makeNotification({ id: 1 }), makeNotification({ id: 2 })], meta: { nextCursor: null } });

      expect(service.getNotifications().map((n) => n.id)).toEqual([1, 2]);
      expect(service.hasMore()).toBeFalse();
    });

    it('loadMore is a no-op when there is no next cursor', (done) => {
      service.loadMore().subscribe((items) => {
        expect(items).toEqual([]);
        done();
      });
      httpMock.expectNone((r) => r.url === `${API_URL}/notifications`);
    });
  });

  // ── R9.2 realtime prepend + unread ──────────────────────────────────────────
  describe('realtime delta via notification$ (R9.2)', () => {
    beforeEach(() => {
      service.loadInbox().subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_URL}/notifications`)
        .flush({ data: [makeNotification({ id: 1, isRead: true })], meta: { unreadCount: 0 } });
    });

    it('prepends a realtime notification and increments unread count', () => {
      notification$.next(makeEvent({ id: 'e1', data: { notificationId: 99 } }));

      expect(service.getNotifications().map((n) => n.id)).toEqual([99, 1]);
      expect(service.getNotifications()[0].isRead).toBeFalse();
      expect(service.getUnreadCount()).toBe(1);
    });

    it('applies the same event id exactly once (Property 9 idempotency)', () => {
      const event = makeEvent({ id: 'e1', data: { notificationId: 99 } });
      notification$.next(event);
      notification$.next(event);
      notification$.next(event);

      expect(service.getNotifications().filter((n) => n.id === 99).length).toBe(1);
      expect(service.getUnreadCount()).toBe(1);
    });

    it('ignores deltas with no event id', () => {
      notification$.next(makeEvent({ id: '' as unknown as string }));
      expect(service.getNotifications().map((n) => n.id)).toEqual([1]);
      expect(service.getUnreadCount()).toBe(0);
    });
  });

  // ── R9.5 mark read / read-all ───────────────────────────────────────────────
  describe('markRead / markAllRead (R9.5)', () => {
    beforeEach(() => {
      service.loadInbox().subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_URL}/notifications`)
        .flush({
          data: [
            makeNotification({ id: 1, isRead: false }),
            makeNotification({ id: 2, isRead: false }),
          ],
          meta: { unreadCount: 2 },
        });
    });

    it('marks one notification read optimistically and decrements unread', () => {
      service.markRead(1).subscribe();
      // optimistic update happened before the response
      expect(service.getNotifications().find((n) => n.id === 1)!.isRead).toBeTrue();
      expect(service.getUnreadCount()).toBe(1);

      const req = httpMock.expectOne(`${API_URL}/notifications/1/read`);
      expect(req.request.method).toBe('POST');
      req.flush({ data: true });
    });

    it('rolls back mark-read on API error', () => {
      service.markRead(1).subscribe({ error: () => undefined });
      expect(service.getUnreadCount()).toBe(1);

      httpMock
        .expectOne(`${API_URL}/notifications/1/read`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(service.getNotifications().find((n) => n.id === 1)!.isRead).toBeFalse();
      expect(service.getUnreadCount()).toBe(2);
    });

    it('markRead is a no-op for an already-read notification', (done) => {
      service.markRead(1).subscribe();
      httpMock.expectOne(`${API_URL}/notifications/1/read`).flush({ data: true });
      expect(service.getUnreadCount()).toBe(1);

      // already read now → no second request
      service.markRead(1).subscribe((r) => {
        expect(r).toBeNull();
        done();
      });
      httpMock.expectNone(`${API_URL}/notifications/1/read`);
    });

    it('marks all read optimistically and zeroes unread', () => {
      service.markAllRead().subscribe();
      expect(service.getNotifications().every((n) => n.isRead)).toBeTrue();
      expect(service.getUnreadCount()).toBe(0);

      const req = httpMock.expectOne(`${API_URL}/notifications/read-all`);
      expect(req.request.method).toBe('POST');
      req.flush({ data: true });
    });

    it('rolls back mark-all-read on API error', () => {
      service.markAllRead().subscribe({ error: () => undefined });
      expect(service.getUnreadCount()).toBe(0);

      httpMock
        .expectOne(`${API_URL}/notifications/read-all`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(service.getNotifications().every((n) => !n.isRead)).toBeTrue();
      expect(service.getUnreadCount()).toBe(2);
    });
  });

  // ── pure helpers ────────────────────────────────────────────────────────────
  describe('pure helpers', () => {
    it('prependNotificationUnique skips duplicates by positive id', () => {
      const items = [makeNotification({ id: 1 })];
      expect(prependNotificationUnique(items, makeNotification({ id: 1 }))).toBe(items);
      expect(
        prependNotificationUnique(items, makeNotification({ id: 2 })).map((n) => n.id),
      ).toEqual([2, 1]);
    });

    it('prependNotificationUnique always prepends when id is unknown (0)', () => {
      const items = [makeNotification({ id: 0 })];
      expect(
        prependNotificationUnique(items, makeNotification({ id: 0 })).length,
      ).toBe(2);
    });

    it('eventToNotification maps a NotificationReceived event to a minimal unread notification', () => {
      const n = eventToNotification(makeEvent({ data: { notificationId: 7 } }));
      expect(n.id).toBe(7);
      expect(n.isRead).toBeFalse();
      expect(n.userId).toBe(0);
      expect(n.type).toBe('hot_area');
    });

    it('extractNotificationId reads notificationId/id and falls back to 0', () => {
      expect(extractNotificationId({ notificationId: 12 })).toBe(12);
      expect(extractNotificationId({ id: '34' })).toBe(34);
      expect(extractNotificationId({})).toBe(0);
      expect(extractNotificationId({ id: -5 })).toBe(0);
    });

    it('readUnreadFromMeta reads unreadCount/unread or returns null', () => {
      expect(readUnreadFromMeta({ unreadCount: 3 })).toBe(3);
      expect(readUnreadFromMeta({ unread: 4 })).toBe(4);
      expect(readUnreadFromMeta({})).toBeNull();
      expect(readUnreadFromMeta(undefined)).toBeNull();
    });
  });
});
