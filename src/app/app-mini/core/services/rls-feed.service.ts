import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';

import { RlsApiService } from './rls-api.service';
import { RLS_API } from '../constants/rls-config.constants';
import {
  RlsCheckin,
  RlsComment,
  RlsCreateCheckinRequest,
  RlsCreatePostRequest,
  RlsFeedQuery,
  RlsNewFeedItemEvent,
  RlsPost,
  RlsReaction,
  RlsReactionType,
} from '../interfaces';
import {
  IdempotencyState,
  applyOnce,
  createIdempotencyState,
} from '../utils/idempotency.util';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Local feed service.
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton (`providedIn: 'root'`) quản lý **một local feed có scope** (khu vực /
 * cộng đồng / địa điểm) cho `LocalFeedPage` và `LocationDetailPage`. Mirror cách
 * `RlsMapService` giữ state qua `BehaviorSubject` — nhưng cho feed: danh sách
 * post + con trỏ phân trang cursor + cờ loading/hasMore. Service KHÔNG tự vẽ UI
 * và KHÔNG biết base URL (host lấy từ `API_URL` qua `RlsApiService`, R14.3); mọi
 * đường dẫn lấy từ `RLS_API` (single source of truth) — không hardcode URL.
 *
 * Bốn nhiệm vụ (Requirement 5):
 *  1. **Cursor-paginated scoped feed** (R5.1) — {@link loadFeed} nạp trang đầu
 *     theo `GET /feed?scope=&ref=&cursor=`; {@link loadMore} nối trang kế bằng
 *     `meta.nextCursor`. Dùng cursor (không OFFSET) nên ổn định khi dữ liệu
 *     realtime chèn liên tục (design.md §6.4, §15 performance).
 *  2. **Realtime prepend idempotent** (R5.4) — {@link applyFeedItemDelta} nhận
 *     event `NewFeedItem` (broadcastAs `feed.item.created`) và *prepend* item mới
 *     vào đầu feed **đúng một lần** qua `applyOnce` của `idempotency.util` (mỗi
 *     `event.id` chỉ áp dụng một lần — Property 9). Loose coupling với
 *     `RlsRealtimeService`: service realtime chỉ cần gọi method này khi nhận
 *     delta, không có phụ thuộc import hai chiều.
 *  3. **Tạo nội dung** — {@link createPost} (`POST /posts`) và
 *     {@link createCheckin} (`POST /checkins`) (R5.2, R5.3). Post tạo xong được
 *     prepend lạc quan; trùng với delta realtime cùng `postId` về sau được khử
 *     (dedupe theo `postId`) nên không hiện hai lần.
 *  4. **React / comment cập nhật count lạc quan** (R5.5) — {@link react} /
 *     {@link removeReaction} / {@link addComment} cập nhật `reactionsCount` /
 *     `commentsCount` ngay trên client rồi gọi API; lỗi → rollback. React
 *     **ép một reaction / user / target**: đổi loại reaction không tăng count,
 *     chỉ reaction đầu tiên mới +1 (khớp ràng buộc unique của backend).
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
 * _Design: 9.4 Core services — RlsFeedService; 6.4 Feed & Posts; 7.1 NewFeedItem; 3.3 idempotency_
 */
@Injectable({ providedIn: 'root' })
export class RlsFeedService {
  private readonly api = inject(RlsApiService);

  /** Danh sách post của feed hiện tại (đã prepend delta realtime / dedupe). */
  readonly feed$ = new BehaviorSubject<RlsPost[]>([]);

  /** Đang nạp trang (đầu hoặc kế tiếp) — cho spinner/skeleton. */
  readonly loading$ = new BehaviorSubject<boolean>(false);

  /** Còn trang để `loadMore` hay không (suy từ `meta.nextCursor`). */
  readonly hasMore$ = new BehaviorSubject<boolean>(false);

  /**
   * State feed bọc idempotency: `value` là mảng post, `processed` là LRU set các
   * `event.id` đã áp dụng (để prepend đúng một lần — Property 9). Nguồn chân lý
   * nội bộ; `feed$` luôn phát `value` sau mỗi thay đổi.
   */
  private feedState: IdempotencyState<RlsPost[]> =
    createIdempotencyState<RlsPost[]>([]);

  /** Query của feed đang hiển thị (scope/ref/limit) — dùng cho `loadMore`. */
  private currentQuery: RlsFeedQuery | null = null;

  /** Con trỏ trang kế tiếp; `null` khi đã hết hoặc chưa nạp. */
  private nextCursor: string | null = null;

  // ─────────────────────────────── Loading feed ───────────────────────────────

  /**
   * Nạp **trang đầu** của một feed có scope (R5.1). Reset state hiện tại (kể cả
   * LRU idempotency) vì đây là feed mới, rồi phát danh sách + cập nhật cursor.
   *
   * @param query scope (`area|community|location`) + `ref` (geohash/communityId/
   *              locationId) + `limit` tuỳ chọn. `cursor` bị bỏ qua ở trang đầu.
   * @returns stream các post của trang đầu.
   */
  loadFeed(query: RlsFeedQuery): Observable<RlsPost[]> {
    this.currentQuery = { ...query, cursor: null };
    this.loading$.next(true);

    return this.api
      .getEnvelope<RlsPost[]>(RLS_API.FEED, this.buildFeedParams(this.currentQuery))
      .pipe(
        map((env) => {
          const items = Array.isArray(env?.data) ? env.data : [];
          this.setCursor((env?.meta?.nextCursor as string | null) ?? null);
          this.resetFeed(items);
          return items;
        }),
        finalize(() => this.loading$.next(false)),
      );
  }

  /**
   * Nối **trang kế tiếp** dùng `nextCursor` của trang trước (R5.1). No-op (trả
   * `[]`) nếu chưa có feed hoặc đã hết trang. Trang mới được *append* vào cuối,
   * giữ nguyên LRU idempotency để các delta đã prepend không bị áp lại.
   *
   * @returns stream các post vừa nối thêm (rỗng nếu không còn trang).
   */
  loadMore(): Observable<RlsPost[]> {
    if (!this.currentQuery || !this.nextCursor) {
      return of([]);
    }
    this.loading$.next(true);
    const query: RlsFeedQuery = { ...this.currentQuery, cursor: this.nextCursor };

    return this.api
      .getEnvelope<RlsPost[]>(RLS_API.FEED, this.buildFeedParams(query))
      .pipe(
        map((env) => {
          const items = Array.isArray(env?.data) ? env.data : [];
          this.setCursor((env?.meta?.nextCursor as string | null) ?? null);
          this.appendItems(items);
          return items;
        }),
        finalize(() => this.loading$.next(false)),
      );
  }

  /** Nạp lại feed hiện tại từ đầu (vd pull-to-refresh) — dùng lại `currentQuery`. */
  refresh(): Observable<RlsPost[]> {
    if (!this.currentQuery) {
      return of([]);
    }
    return this.loadFeed(this.currentQuery);
  }

  // ─────────────────────────── Realtime prepend (R5.4) ────────────────────────

  /**
   * Áp delta realtime `feed.item.created` (event `NewFeedItem`, design.md §7.1):
   * **prepend** item mới vào đầu feed đúng **một lần** theo `event.id` (R5.4,
   * Property 9). Vì giao nhận realtime là *at-least-once* (reconnect/replay có
   * thể lặp event), `applyOnce` đảm bảo cùng một `event.id` áp lại n lần cho ra
   * cùng kết quả như áp một lần.
   *
   * Loose coupling: `RlsRealtimeService` chỉ cần gọi method này khi nhận event
   * trên kênh `area.*` — không import ngược lại feed service.
   *
   * No-op nếu chưa có feed đang hiển thị (`currentQuery == null`) hoặc event
   * thiếu `id` (không thể khử trùng an toàn).
   */
  applyFeedItemDelta(event: RlsNewFeedItemEvent): void {
    if (!this.currentQuery || !event || !event.id) {
      return;
    }
    this.feedState = applyOnce(this.feedState, event.id, (items) =>
      prependDelta(items, event),
    );
    this.feed$.next(this.feedState.value);
  }

  // ─────────────────────────── Create content (R5.2/5.3) ──────────────────────

  /**
   * Tạo post mới (`POST /posts`, R5.2). Khi thành công, *prepend* lạc quan post
   * vừa tạo để người dùng thấy ngay; nếu sau đó delta realtime cùng `postId` về
   * thì được khử trùng (dedupe theo `id`) nên không hiển thị hai lần (R5.3 — fan
   * -out job ở backend sẽ broadcast lại).
   */
  createPost(request: RlsCreatePostRequest): Observable<RlsPost> {
    return this.api.post<RlsPost>(RLS_API.POSTS, request).pipe(
      tap((post) => {
        if (post && post.id != null) {
          this.prependPost(post);
        }
      }),
    );
  }

  /**
   * Tạo check-in (`POST /checkins`, R5.3). Check-in làm tăng heat + enqueue
   * aggregation/fan-out ở backend; feed item tương ứng (nếu có) sẽ tới qua delta
   * realtime `feed.item.created` nên KHÔNG prepend ở đây để tránh nội dung giả
   * lập sai hình dạng. Trả về bản ghi check-in đã tạo.
   */
  createCheckin(request: RlsCreateCheckinRequest): Observable<RlsCheckin> {
    return this.api.post<RlsCheckin>(RLS_API.CHECKINS, request);
  }

  // ───────────────────────── React / comment (R5.5) ───────────────────────────

  /**
   * React lên một post (`POST /posts/{id}/reactions`, R5.5) với cập nhật count
   * **lạc quan** và **ép một reaction / user / target**:
   *  - chưa react trước đó → `reactionsCount + 1`, đặt `myReaction = type`;
   *  - đã react (đổi loại) → count GIỮ NGUYÊN, chỉ đổi `myReaction` (khớp unique
   *    index `(user, reactable)` của backend — không cộng dồn).
   *
   * Lỗi mạng/từ chối → rollback về trạng thái reaction trước đó.
   */
  react(postId: number, type: RlsReactionType): Observable<RlsReaction> {
    const previous = this.snapshotReaction(postId);
    this.applyReactionOptimistic(postId, type);

    return this.api
      .post<RlsReaction>(this.buildPath(RLS_API.POST_REACTIONS, postId), { type })
      .pipe(
        catchError((err) => {
          this.restoreReaction(postId, previous);
          return throwError(() => err);
        }),
      );
  }

  /**
   * Bỏ react khỏi post (`DELETE /posts/{id}/reactions`, R5.5). Cập nhật lạc quan:
   * nếu đang có reaction → `reactionsCount - 1` (kẹp ≥ 0) và `myReaction = null`.
   * No-op nếu chưa từng react. Lỗi → rollback.
   */
  removeReaction(postId: number): Observable<unknown> {
    const previous = this.snapshotReaction(postId);
    if (!previous || previous.myReaction == null) {
      return of(null);
    }
    this.applyReactionRemovalOptimistic(postId);

    return this.api
      .delete<unknown>(this.buildPath(RLS_API.POST_REACTIONS, postId))
      .pipe(
        catchError((err) => {
          this.restoreReaction(postId, previous);
          return throwError(() => err);
        }),
      );
  }

  /**
   * Thêm comment vào post (`POST /posts/{id}/comments`, R5.5) với tăng
   * `commentsCount` lạc quan; lỗi → giảm lại. Hỗ trợ threading qua `parentId`.
   */
  addComment(
    postId: number,
    content: string,
    parentId?: number | null,
  ): Observable<RlsComment> {
    this.adjustCommentCount(postId, +1);

    return this.api
      .post<RlsComment>(this.buildPath(RLS_API.POST_COMMENTS, postId), {
        content,
        parentId: parentId ?? undefined,
      })
      .pipe(
        catchError((err) => {
          this.adjustCommentCount(postId, -1);
          return throwError(() => err);
        }),
      );
  }

  // ─────────────────────────────── Accessors ──────────────────────────────────

  /** Danh sách post hiện tại (đồng bộ). */
  getFeed(): RlsPost[] {
    return this.feedState.value;
  }

  /** Còn trang để nạp tiếp hay không (đồng bộ). */
  hasMore(): boolean {
    return this.nextCursor != null;
  }

  /** Con trỏ trang kế tiếp hiện tại (hoặc `null`). */
  getNextCursor(): string | null {
    return this.nextCursor;
  }

  /** Dọn toàn bộ state feed (vd rời trang) — reset items, cursor, query, LRU. */
  reset(): void {
    this.currentQuery = null;
    this.setCursor(null);
    this.resetFeed([]);
  }

  // ─────────────────────────── Private: state helpers ─────────────────────────

  /** Thay toàn bộ feed + reset LRU idempotency (feed mới → cho phép áp lại delta). */
  private resetFeed(items: RlsPost[]): void {
    this.feedState = createIdempotencyState<RlsPost[]>(items.slice());
    this.feed$.next(this.feedState.value);
  }

  /** Nối các post vào cuối feed (giữ LRU idempotency), khử trùng theo `id`. */
  private appendItems(items: RlsPost[]): void {
    if (items.length === 0) {
      return;
    }
    const existingIds = new Set(this.feedState.value.map((p) => p.id));
    const fresh = items.filter((p) => !existingIds.has(p.id));
    if (fresh.length === 0) {
      return;
    }
    this.feedState = {
      ...this.feedState,
      value: [...this.feedState.value, ...fresh],
    };
    this.feed$.next(this.feedState.value);
  }

  /** Prepend một post đầy đủ (vd vừa tạo) — dedupe theo `id`. */
  private prependPost(post: RlsPost): void {
    this.feedState = {
      ...this.feedState,
      value: prependUnique(this.feedState.value, post),
    };
    this.feed$.next(this.feedState.value);
  }

  /** Áp một biến đổi thuần lên post khớp `id`; phát lại `feed$` nếu có thay đổi. */
  private mutatePost(postId: number, fn: (post: RlsPost) => RlsPost): void {
    const items = this.feedState.value;
    const index = items.findIndex((p) => p.id === postId);
    if (index < 0) {
      return;
    }
    const next = items.slice();
    next[index] = fn(items[index]);
    this.feedState = { ...this.feedState, value: next };
    this.feed$.next(this.feedState.value);
  }

  /** Snapshot reaction hiện tại của post (cho rollback). */
  private snapshotReaction(
    postId: number,
  ): { myReaction: RlsReactionType | null; reactionsCount: number } | null {
    const post = this.feedState.value.find((p) => p.id === postId);
    if (!post) {
      return null;
    }
    return {
      myReaction: post.myReaction ?? null,
      reactionsCount: post.reactionsCount,
    };
  }

  /** Cập nhật lạc quan khi react: chỉ +1 cho reaction đầu tiên (one-per-target). */
  private applyReactionOptimistic(postId: number, type: RlsReactionType): void {
    this.mutatePost(postId, (post) => {
      const had = (post.myReaction ?? null) != null;
      const reactionsCount = had ? post.reactionsCount : post.reactionsCount + 1;
      return { ...post, myReaction: type, reactionsCount: Math.max(0, reactionsCount) };
    });
  }

  /** Cập nhật lạc quan khi bỏ react: -1 (kẹp ≥ 0) và xoá `myReaction`. */
  private applyReactionRemovalOptimistic(postId: number): void {
    this.mutatePost(postId, (post) => ({
      ...post,
      myReaction: null,
      reactionsCount: Math.max(0, post.reactionsCount - 1),
    }));
  }

  /** Khôi phục reaction về snapshot trước đó (rollback khi API lỗi). */
  private restoreReaction(
    postId: number,
    previous: { myReaction: RlsReactionType | null; reactionsCount: number } | null,
  ): void {
    if (!previous) {
      return;
    }
    this.mutatePost(postId, (post) => ({
      ...post,
      myReaction: previous.myReaction,
      reactionsCount: Math.max(0, previous.reactionsCount),
    }));
  }

  /** Cộng/trừ `commentsCount` của post (kẹp ≥ 0). */
  private adjustCommentCount(postId: number, delta: number): void {
    this.mutatePost(postId, (post) => ({
      ...post,
      commentsCount: Math.max(0, post.commentsCount + delta),
    }));
  }

  /** Cập nhật cursor + cờ `hasMore$`. */
  private setCursor(cursor: string | null): void {
    this.nextCursor = cursor;
    this.hasMore$.next(cursor != null);
  }

  /** Thay `:id` trong template path (vd `/posts/:id/reactions`). */
  private buildPath(template: string, id: number | string): string {
    return template.replace(':id', String(id));
  }

  /** Dựng query params cho `GET /feed` (scope/ref/cursor/limit). */
  private buildFeedParams(query: RlsFeedQuery): Record<string, unknown> {
    return {
      scope: query.scope,
      ref: query.ref,
      cursor: query.cursor ?? undefined,
      limit: query.limit,
    };
  }
}

// ── module-level pure helpers (export để unit-test trực tiếp) ────────────────

/**
 * Prepend post `incoming` vào đầu mảng, khử trùng theo `id`: nếu `id` đã tồn tại
 * thì giữ nguyên mảng (không thêm, không dời chỗ) để feed không nhân đôi khi post
 * tự tạo và delta realtime cùng `postId` cùng tới.
 */
export function prependUnique(items: RlsPost[], incoming: RlsPost): RlsPost[] {
  if (items.some((p) => p.id === incoming.id)) {
    return items;
  }
  return [incoming, ...items];
}

/**
 * Reducer thuần cho realtime prepend: ánh xạ `NewFeedItem` (payload mỏng từ
 * broadcast) sang `RlsPost` tối thiểu rồi prepend (dedupe theo `postId`). Hàm
 * thuần → bảo toàn tính idempotent khi bọc trong `applyOnce`.
 */
export function prependDelta(
  items: RlsPost[],
  event: RlsNewFeedItemEvent,
): RlsPost[] {
  return prependUnique(items, deltaToPost(event));
}

/** Ánh xạ `NewFeedItem` (design.md §7.1) → `RlsPost` tối thiểu để render. */
export function deltaToPost(event: RlsNewFeedItemEvent): RlsPost {
  return {
    id: event.postId,
    userId: 0,
    author: {
      id: 0,
      displayName: event.authorName,
      avatarUrl: event.authorAvatar ?? null,
    },
    type: event.type,
    content: event.excerpt ?? '',
    media: event.thumbnailUrl ? [event.thumbnailUrl] : undefined,
    status: 'active',
    reactionsCount: 0,
    commentsCount: 0,
    myReaction: null,
    createdAt: event.createdAt,
  };
}
