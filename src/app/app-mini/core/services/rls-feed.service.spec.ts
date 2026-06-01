/**
 * Unit tests for RlsFeedService — verifies cursor-paginated scoped feed loading,
 * idempotent realtime prepend of `feed.item.created` deltas, post/check-in
 * creation, and optimistic reaction/comment count updates enforcing one
 * reaction per user per target.
 *
 * Uses Angular's HttpClientTestingModule so requests are asserted without a real
 * network. The service is exercised through `RlsApiService` (the only HTTP
 * entrypoint), matching production wiring.
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
 */
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { API_URL } from 'src/environments/environment';

import { RlsFeedService, deltaToPost, prependDelta, prependUnique } from './rls-feed.service';
import {
  RlsNewFeedItemEvent,
  RlsPost,
  RlsApiEnvelope,
} from '../interfaces';

function makePost(overrides: Partial<RlsPost> = {}): RlsPost {
  return {
    id: 1,
    userId: 10,
    type: 'text',
    content: 'hello',
    status: 'active',
    reactionsCount: 0,
    commentsCount: 0,
    myReaction: null,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeDelta(overrides: Partial<RlsNewFeedItemEvent> = {}): RlsNewFeedItemEvent {
  return {
    id: 'evt-1',
    postId: 99,
    type: 'checkin',
    authorName: 'Mai',
    authorAvatar: 'https://cdn/a.png',
    excerpt: 'just checked in',
    createdAt: '2024-01-02T00:00:00Z',
    ...overrides,
  };
}

describe('RlsFeedService', () => {
  let service: RlsFeedService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RlsFeedService],
    });
    service = TestBed.inject(RlsFeedService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  // ── R5.1 cursor-paginated scoped feed ──────────────────────────────────────
  describe('loadFeed / loadMore (cursor pagination, R5.1)', () => {
    it('loads the first page scoped by area and tracks the cursor', () => {
      const page1 = [makePost({ id: 1 }), makePost({ id: 2 })];
      let emitted: RlsPost[] | undefined;
      service.loadFeed({ scope: 'area', ref: 'w21z' }).subscribe((r) => (emitted = r));

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/feed`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('scope')).toBe('area');
      expect(req.request.params.get('ref')).toBe('w21z');
      req.flush({ data: page1, meta: { nextCursor: 'cur-2' } } as RlsApiEnvelope<RlsPost[]>);

      expect(emitted).toEqual(page1);
      expect(service.getFeed()).toEqual(page1);
      expect(service.hasMore()).toBeTrue();
      expect(service.getNextCursor()).toBe('cur-2');
    });

    it('appends the next page using the stored cursor and dedupes by id', () => {
      service.loadFeed({ scope: 'location', ref: 5 }).subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_URL}/feed`)
        .flush({ data: [makePost({ id: 1 })], meta: { nextCursor: 'cur-2' } });

      service.loadMore().subscribe();
      const req2 = httpMock.expectOne((r) => r.url === `${API_URL}/feed`);
      expect(req2.request.params.get('cursor')).toBe('cur-2');
      // id:1 is a duplicate and must be dropped; id:2 appended.
      req2.flush({ data: [makePost({ id: 1 }), makePost({ id: 2 })], meta: { nextCursor: null } });

      expect(service.getFeed().map((p) => p.id)).toEqual([1, 2]);
      expect(service.hasMore()).toBeFalse();
    });

    it('loadMore is a no-op when there is no next cursor', (done) => {
      service.loadMore().subscribe((items) => {
        expect(items).toEqual([]);
        done();
      });
      httpMock.expectNone((r) => r.url === `${API_URL}/feed`);
    });
  });

  // ── R5.4 realtime prepend idempotency ──────────────────────────────────────
  describe('applyFeedItemDelta (realtime prepend, R5.4)', () => {
    beforeEach(() => {
      service.loadFeed({ scope: 'area', ref: 'w21z' }).subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_URL}/feed`)
        .flush({ data: [makePost({ id: 1 })], meta: { nextCursor: null } });
    });

    it('prepends a new feed item to the front of the feed', () => {
      service.applyFeedItemDelta(makeDelta({ id: 'e1', postId: 99 }));
      expect(service.getFeed().map((p) => p.id)).toEqual([99, 1]);
    });

    it('applies the same event id exactly once (Property 9 idempotency)', () => {
      const delta = makeDelta({ id: 'e1', postId: 99 });
      service.applyFeedItemDelta(delta);
      service.applyFeedItemDelta(delta);
      service.applyFeedItemDelta(delta);
      expect(service.getFeed().filter((p) => p.id === 99).length).toBe(1);
      expect(service.getFeed().map((p) => p.id)).toEqual([99, 1]);
    });

    it('ignores deltas with no event id and when no feed is active', () => {
      service.applyFeedItemDelta(makeDelta({ id: '' as unknown as string }));
      expect(service.getFeed().map((p) => p.id)).toEqual([1]);
    });
  });

  // ── R5.2 / R5.3 create content ─────────────────────────────────────────────
  describe('createPost / createCheckin (R5.2, R5.3)', () => {
    beforeEach(() => {
      service.loadFeed({ scope: 'area', ref: 'w21z' }).subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_URL}/feed`)
        .flush({ data: [makePost({ id: 1 })], meta: { nextCursor: null } });
    });

    it('creates a post and optimistically prepends it', () => {
      service.createPost({ type: 'text', content: 'new' }).subscribe();
      const req = httpMock.expectOne(`${API_URL}/posts`);
      expect(req.request.method).toBe('POST');
      req.flush({ data: makePost({ id: 42, content: 'new' }) });

      expect(service.getFeed().map((p) => p.id)).toEqual([42, 1]);
    });

    it('does not duplicate a post that later arrives as a realtime delta', () => {
      service.createPost({ type: 'text', content: 'new' }).subscribe();
      httpMock.expectOne(`${API_URL}/posts`).flush({ data: makePost({ id: 42 }) });

      service.applyFeedItemDelta(makeDelta({ id: 'e-dup', postId: 42 }));
      expect(service.getFeed().filter((p) => p.id === 42).length).toBe(1);
    });

    it('creates a check-in without prepending a synthetic feed item', () => {
      service
        .createCheckin({ locationId: 5, lat: 21.02, lng: 105.85 })
        .subscribe();
      const req = httpMock.expectOne(`${API_URL}/checkins`);
      expect(req.request.method).toBe('POST');
      req.flush({ data: { id: 7, userId: 10, locationId: 5, lat: 21.02, lng: 105.85, createdAt: 'x' } });

      expect(service.getFeed().map((p) => p.id)).toEqual([1]);
    });
  });

  // ── R5.5 react / comment with count updates ────────────────────────────────
  describe('react / removeReaction / addComment (R5.5)', () => {
    beforeEach(() => {
      service.loadFeed({ scope: 'area', ref: 'w21z' }).subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_URL}/feed`)
        .flush({
          data: [makePost({ id: 1, reactionsCount: 2, commentsCount: 1, myReaction: null })],
          meta: { nextCursor: null },
        });
    });

    it('increments reaction count by one on first reaction', () => {
      service.react(1, 'like').subscribe();
      // optimistic update happened before the response
      expect(service.getFeed()[0].reactionsCount).toBe(3);
      expect(service.getFeed()[0].myReaction).toBe('like');
      httpMock
        .expectOne(`${API_URL}/posts/1/reactions`)
        .flush({ data: { id: 1, userId: 10, reactableType: 'post', reactableId: 1, type: 'like', createdAt: 'x' } });
    });

    it('does not increment count when changing reaction type (one per target)', () => {
      service.react(1, 'like').subscribe();
      httpMock.expectOne(`${API_URL}/posts/1/reactions`).flush({ data: {} });
      expect(service.getFeed()[0].reactionsCount).toBe(3);

      service.react(1, 'love').subscribe();
      expect(service.getFeed()[0].reactionsCount).toBe(3); // unchanged
      expect(service.getFeed()[0].myReaction).toBe('love');
      httpMock.expectOne(`${API_URL}/posts/1/reactions`).flush({ data: {} });
    });

    it('rolls back the optimistic reaction on API error', () => {
      service.react(1, 'fire').subscribe({ error: () => undefined });
      expect(service.getFeed()[0].reactionsCount).toBe(3);
      httpMock
        .expectOne(`${API_URL}/posts/1/reactions`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(service.getFeed()[0].reactionsCount).toBe(2);
      expect(service.getFeed()[0].myReaction).toBeNull();
    });

    it('removeReaction decrements count and clears myReaction', () => {
      service.react(1, 'like').subscribe();
      httpMock.expectOne(`${API_URL}/posts/1/reactions`).flush({ data: {} });
      expect(service.getFeed()[0].reactionsCount).toBe(3);

      service.removeReaction(1).subscribe();
      expect(service.getFeed()[0].reactionsCount).toBe(2);
      expect(service.getFeed()[0].myReaction).toBeNull();
      const del = httpMock.expectOne(`${API_URL}/posts/1/reactions`);
      expect(del.request.method).toBe('DELETE');
      del.flush({ data: true });
    });

    it('removeReaction is a no-op when the user has not reacted', (done) => {
      service.removeReaction(1).subscribe((r) => {
        expect(r).toBeNull();
        done();
      });
      httpMock.expectNone(`${API_URL}/posts/1/reactions`);
      expect(service.getFeed()[0].reactionsCount).toBe(2);
    });

    it('addComment increments commentsCount and rolls back on error', () => {
      service.addComment(1, 'nice!').subscribe();
      expect(service.getFeed()[0].commentsCount).toBe(2);
      const req = httpMock.expectOne(`${API_URL}/posts/1/comments`);
      expect(req.request.body.content).toBe('nice!');
      req.flush({ data: { id: 3, userId: 10, postId: 1, content: 'nice!', createdAt: 'x' } });
      expect(service.getFeed()[0].commentsCount).toBe(2);

      service.addComment(1, 'oops').subscribe({ error: () => undefined });
      expect(service.getFeed()[0].commentsCount).toBe(3);
      httpMock
        .expectOne(`${API_URL}/posts/1/comments`)
        .flush('boom', { status: 500, statusText: 'Server Error' });
      expect(service.getFeed()[0].commentsCount).toBe(2);
    });
  });

  // ── pure helpers ────────────────────────────────────────────────────────────
  describe('pure helpers', () => {
    it('prependUnique skips duplicates by id', () => {
      const items = [makePost({ id: 1 })];
      expect(prependUnique(items, makePost({ id: 1 }))).toBe(items);
      expect(prependUnique(items, makePost({ id: 2 })).map((p) => p.id)).toEqual([2, 1]);
    });

    it('deltaToPost maps a NewFeedItem event to a minimal post', () => {
      const post = deltaToPost(makeDelta({ postId: 7, thumbnailUrl: 'https://t/x.png' }));
      expect(post.id).toBe(7);
      expect(post.media).toEqual(['https://t/x.png']);
      expect(post.reactionsCount).toBe(0);
    });

    it('prependDelta prepends a mapped delta and dedupes', () => {
      const items = [makePost({ id: 7 })];
      expect(prependDelta(items, makeDelta({ postId: 7 }))).toBe(items);
      expect(prependDelta(items, makeDelta({ postId: 8 })).map((p) => p.id)).toEqual([8, 7]);
    });
  });
});
