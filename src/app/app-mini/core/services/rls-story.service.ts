import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { RlsApiService } from './rls-api.service';
import { RLS_API } from '../constants/rls-config.constants';
import {
  RlsCreateStoryRequest,
  RlsNearbyStoriesQuery,
  RlsStory,
  RlsStoryCreatedEvent,
  RlsStoryExpiredEvent,
  RlsStoryMapQuery,
} from '../interfaces';
import {
  StoryStatus,
  TimeInput,
  isStoryActive,
} from '../utils/story-expiry.util';
import { haversine } from '../utils/distance.util';
import { LruSet, createLruSet, lruAdd, lruHas } from '../utils/idempotency.util';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Story service (24h ephemeral).
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton (`providedIn: 'root'`) quản lý vòng đời **story 24h** cho
 * `StoryViewerPage` + story ring / story map (design.md §6.7, §9.4). Mirror cách
 * `RlsFeedService`/`RlsMapService` giữ state qua `BehaviorSubject` và lấy mọi
 * đường dẫn từ `RLS_API` (single source of truth) — KHÔNG hardcode URL (host từ
 * `API_URL` qua `RlsApiService`, R14.3). Service KHÔNG vẽ UI và KHÔNG biết base URL.
 *
 * Bốn nhiệm vụ (Requirement 8):
 *  1. **Đăng story** (R8.1) — {@link createStory} (`POST /stories`). `expires_at`
 *     do backend đặt `= created_at + 24h` (StoryObserver, design.md §11.5);
 *     client chỉ gửi media/vị trí. Story mới được merge lạc quan vào state cục
 *     bộ (map + nearby nếu nằm trong bán kính đang xem).
 *  2. **Nearby active** (R8.2, R8.3) — {@link loadNearby}
 *     (`GET /stories/nearby?lat=&lng=&radius=`). Sau khi nhận danh sách, **lọc
 *     hết hạn phía client** bằng `isStoryActive` của `story-expiry.util` (story
 *     active ⟺ `status==='active' ∧ now < expiresAt`) để không hiển thị story
 *     vừa qua mốc 24h dù backend chưa kịp chạy job (R8.4).
 *  3. **Story map** (R8.6) — {@link loadStoryMap} (`GET /stories/map?bbox=`),
 *     cũng lọc hết hạn phía client trước khi phát state cho story-map pins.
 *  4. **Hội tụ realtime** (R8.4, R8.5) — {@link applyStoryExpiredDelta} (event
 *     `story.expired`) **gỡ** story hết hạn khỏi state cục bộ để mọi client hội
 *     tụ về cùng trạng thái với server; {@link applyStoryCreatedDelta} (event
 *     `story.created`) **thêm** story mới. Cả hai áp **đúng một lần** theo
 *     `event.id` qua LRU idempotency (reuse `idempotency.util`, Property 9) vì
 *     realtime là at-least-once (reconnect/replay có thể lặp event).
 *
 * **Loose coupling** với `RlsRealtimeService`: service realtime chỉ cần gọi các
 * method `apply*Delta` khi nhận event trên kênh `area.*` — không import ngược
 * lại story service (đối xứng với `RlsFeedService.applyFeedItemDelta`).
 *
 * Tính hết hạn là **thuần** (now luôn được truyền/khởi tạo tại biên service),
 * uỷ quyền cho `story-expiry.util` đã được property-test (Property 5).
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
 * _Design: 9.4 Core services — RlsStoryService; 6.7 Stories; 7 events; 11.5 expiry_
 */
@Injectable({ providedIn: 'root' })
export class RlsStoryService {
  // ───────────────────────────────── State ────────────────────────────────────

  /** Story gần đang còn hiệu lực (đã lọc hết hạn phía client) — cho story ring. */
  readonly nearbyStories$ = new BehaviorSubject<RlsStory[]>([]);

  /** Story trên bản đồ (đã lọc hết hạn phía client) — cho story-map pins. */
  readonly mapStories$ = new BehaviorSubject<RlsStory[]>([]);

  /** Đang nạp (nearby hoặc map) — cho spinner/skeleton. */
  readonly loading$ = new BehaviorSubject<boolean>(false);

  // ──────────────────────────────── Internals ─────────────────────────────────

  /**
   * LRU set các `event.id` realtime đã xử lý (story.created / story.expired) —
   * chống áp trùng do reconnect/replay (Property 9). Một set dùng chung cho cả
   * hai loại delta vì mỗi event mang một uuid riêng.
   */
  private processed: LruSet = createLruSet();

  /**
   * Query nearby gần nhất (center + radius) — dùng để quyết định một story mới
   * (delta `story.created`) có thuộc vòng nearby đang hiển thị hay không.
   */
  private lastNearbyQuery: RlsNearbyStoriesQuery | null = null;

  constructor(private readonly api: RlsApiService) {}

  // ──────────────────────────────── Create (R8.1) ─────────────────────────────

  /**
   * Đăng story mới (`POST /stories`, R8.1). Backend đặt `expires_at = created_at
   * + 24h` (bất biến §11.5) và trả về story đầy đủ. Khi thành công, merge lạc
   * quan story vào state cục bộ: luôn vào story map; vào nearby nếu nằm trong
   * bán kính nearby đang xem. Chỉ merge khi story còn active để không hiển thị
   * story đã hết hạn ngay khi tạo (phòng lệch đồng hồ).
   */
  createStory(request: RlsCreateStoryRequest): Observable<RlsStory> {
    return this.api.post<RlsStory>(RLS_API.STORIES, request).pipe(
      tap((story) => {
        if (story && story.id != null) {
          this.mergeCreatedStory(story, Date.now());
        }
      }),
    );
  }

  // ──────────────────────────── Load nearby (R8.2/8.3) ────────────────────────

  /**
   * Nạp **story gần đang còn hiệu lực** (`GET /stories/nearby?lat=&lng=&radius=`,
   * R8.3). Backend đã lọc theo bán kính + active, nhưng client lọc lại bằng
   * `isStoryActive` (now hiện tại) để loại story vừa qua mốc 24h trước khi job
   * server chạy (R8.4). Lưu lại query để delta `story.created` biết phạm vi.
   */
  loadNearby(query: RlsNearbyStoriesQuery): Observable<RlsStory[]> {
    this.lastNearbyQuery = { ...query };
    this.loading$.next(true);

    return this.api
      .get<RlsStory[]>(RLS_API.STORIES_NEARBY, {
        lat: query.lat,
        lng: query.lng,
        radius: query.radiusM,
      })
      .pipe(
        map((data) => {
          const items = Array.isArray(data) ? data : [];
          const active = filterActiveStories(items, Date.now());
          this.nearbyStories$.next(active);
          return active;
        }),
        tap({
          next: () => this.loading$.next(false),
          error: () => this.loading$.next(false),
        }),
      );
  }

  // ────────────────────────────── Story map (R8.6) ────────────────────────────

  /**
   * Nạp **story trên bản đồ** theo viewport (`GET /stories/map?bbox=`, R8.6).
   * Cũng lọc hết hạn phía client trước khi phát state cho story-map pins (R8.4).
   */
  loadStoryMap(query: RlsStoryMapQuery): Observable<RlsStory[]> {
    this.loading$.next(true);

    return this.api
      .get<RlsStory[]>(RLS_API.STORIES_MAP, { bbox: query.bbox })
      .pipe(
        map((data) => {
          const items = Array.isArray(data) ? data : [];
          const active = filterActiveStories(items, Date.now());
          this.mapStories$.next(active);
          return active;
        }),
        tap({
          next: () => this.loading$.next(false),
          error: () => this.loading$.next(false),
        }),
      );
  }

  /** Xem chi tiết một story (`GET /stories/{id}`, tăng view — design.md §6.7). */
  getStory(storyId: number): Observable<RlsStory> {
    return this.api.get<RlsStory>(this.buildPath(RLS_API.STORY_DETAIL, storyId));
  }

  // ─────────────────────────── Realtime convergence (R8.5) ─────────────────────

  /**
   * Áp delta `story.expired` (event {@link RlsStoryExpiredEvent}): **gỡ** story
   * hết hạn khỏi cả nearby lẫn map để client hội tụ với server (R8.4, R8.5).
   * Áp đúng **một lần** theo `event.id` (Property 9). No-op nếu event thiếu `id`.
   *
   * Loose coupling: `RlsRealtimeService` gọi method này khi nhận event trên kênh
   * `area.*` — không phụ thuộc import hai chiều.
   */
  applyStoryExpiredDelta(event: RlsStoryExpiredEvent): void {
    if (!this.applyOnceGuard(event?.id)) {
      return;
    }
    this.setNearby(removeStoryById(this.nearbyStories$.getValue(), event.storyId));
    this.setMap(removeStoryById(this.mapStories$.getValue(), event.storyId));
  }

  /**
   * Áp delta `story.created` (event {@link RlsStoryCreatedEvent}): **thêm** story
   * mới (dedupe theo `id`) để client hội tụ (R8.5). Vào story map nếu còn active;
   * vào nearby nếu còn active VÀ nằm trong bán kính nearby đang xem. Áp đúng
   * **một lần** theo `event.id` (Property 9). No-op nếu event thiếu `id`.
   */
  applyStoryCreatedDelta(event: RlsStoryCreatedEvent): void {
    if (!this.applyOnceGuard(event?.id)) {
      return;
    }
    this.mergeCreatedStory(createdEventToStory(event), Date.now());
  }

  /**
   * Lọc lại state cục bộ tại thời điểm `now`, gỡ những story không còn active
   * (R8.4 — "ngừng hiển thị client-side ở lần render kế"). Hữu ích để page gọi
   * định kỳ / mỗi lần render mà không cần chờ delta server.
   */
  pruneExpired(now: TimeInput = Date.now()): void {
    this.setNearby(filterActiveStories(this.nearbyStories$.getValue(), now));
    this.setMap(filterActiveStories(this.mapStories$.getValue(), now));
  }

  // ─────────────────────────────── Accessors ──────────────────────────────────

  /** Story nearby hiện tại (đồng bộ). */
  getNearbyStories(): RlsStory[] {
    return this.nearbyStories$.getValue();
  }

  /** Story map hiện tại (đồng bộ). */
  getMapStories(): RlsStory[] {
    return this.mapStories$.getValue();
  }

  /** Dọn toàn bộ state story (vd rời trang) — reset nearby, map, query, LRU. */
  reset(): void {
    this.lastNearbyQuery = null;
    this.processed = createLruSet();
    this.setNearby([]);
    this.setMap([]);
  }

  // ─────────────────────────── Private: state helpers ─────────────────────────

  /**
   * Merge một story đầy đủ vào state cục bộ tại `now`: bỏ qua nếu đã hết hạn;
   * luôn upsert vào story map; upsert vào nearby nếu nằm trong bán kính nearby
   * đang xem (dựa `lastNearbyQuery` + haversine). Dedupe theo `id`.
   */
  private mergeCreatedStory(story: RlsStory, now: TimeInput): void {
    if (!isStoryActive(toExpiryView(story), now)) {
      return;
    }
    this.setMap(upsertStory(this.mapStories$.getValue(), story));

    if (this.isWithinNearby(story)) {
      this.setNearby(upsertStory(this.nearbyStories$.getValue(), story));
    }
  }

  /** Story có nằm trong vòng nearby đang xem không (center + radius gần nhất). */
  private isWithinNearby(story: RlsStory): boolean {
    const q = this.lastNearbyQuery;
    if (!q) {
      return false;
    }
    const distanceM = haversine(q.lat, q.lng, story.lat, story.lng);
    return distanceM <= q.radiusM;
  }

  /**
   * Guard idempotency: trả `true` (và ghi nhận id) chỉ khi `id` hợp lệ và chưa
   * xử lý; trả `false` nếu thiếu id hoặc đã xử lý (caller bỏ qua delta).
   */
  private applyOnceGuard(id: string | null | undefined): boolean {
    if (typeof id !== 'string' || id === '') {
      return false;
    }
    if (lruHas(this.processed, id)) {
      return false;
    }
    this.processed = lruAdd(this.processed, id);
    return true;
  }

  /** Phát nearby mới nếu khác tham chiếu (tránh phát thừa). */
  private setNearby(stories: RlsStory[]): void {
    this.nearbyStories$.next(stories);
  }

  /** Phát map mới. */
  private setMap(stories: RlsStory[]): void {
    this.mapStories$.next(stories);
  }

  /** Thay `:id` trong template path (vd `/stories/:id`). */
  private buildPath(template: string, id: number | string): string {
    return template.replace(':id', String(id));
  }
}

// ── module-level pure helpers (export để unit-test trực tiếp) ────────────────

/**
 * Phần tối thiểu của `RlsStory` cho `isStoryActive` — ép `status` về
 * `StoryStatus` (các giá trị trùng `RlsStoryStatus`); util tự coi mọi status
 * khác `'active'` là không active nên ép kiểu an toàn.
 */
function toExpiryView(story: RlsStory): { status: StoryStatus; expiresAt: TimeInput } {
  return { status: story.status as StoryStatus, expiresAt: story.expiresAt };
}

/**
 * Lọc danh sách story chỉ giữ những story còn **active** tại `now`
 * (`status==='active' ∧ now < expiresAt`) — dùng `story-expiry.util` (Property 5).
 * Hàm thuần.
 */
export function filterActiveStories(
  stories: readonly RlsStory[],
  now: TimeInput,
): RlsStory[] {
  return stories.filter((s) => isStoryActive(toExpiryView(s), now));
}

/**
 * Upsert một story vào danh sách (thêm vào đầu nếu mới, thay tại chỗ nếu đã có
 * theo `id`) — dedupe để delta realtime + tạo lạc quan không nhân đôi. Hàm thuần.
 */
export function upsertStory(stories: RlsStory[], incoming: RlsStory): RlsStory[] {
  const index = stories.findIndex((s) => s.id === incoming.id);
  if (index < 0) {
    return [incoming, ...stories];
  }
  const next = stories.slice();
  next[index] = { ...stories[index], ...incoming };
  return next;
}

/** Gỡ story khớp `id` khỏi danh sách (giữ nguyên tham chiếu nếu không có). Hàm thuần. */
export function removeStoryById(stories: RlsStory[], storyId: number): RlsStory[] {
  const next = stories.filter((s) => s.id !== storyId);
  return next.length === stories.length ? stories : next;
}

/**
 * Ánh xạ `.StoryCreated` (payload realtime mỏng, design.md §7 / §6.7) →
 * `RlsStory` đầy đủ tối thiểu để render pin/ring. Hàm thuần.
 */
export function createdEventToStory(event: RlsStoryCreatedEvent): RlsStory {
  return {
    id: event.storyId,
    userId: event.userId,
    authorName: event.authorName,
    authorAvatar: event.authorAvatar ?? null,
    mediaUrl: event.mediaUrl,
    mediaType: event.mediaType,
    lat: event.lat,
    lng: event.lng,
    geohash6: event.geohash6,
    status: 'active',
    expiresAt: event.expiresAt,
    createdAt: event.createdAt,
  };
}
