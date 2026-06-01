import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, Subscription } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

import { RlsApiService } from './rls-api.service';
import { RlsRealtimeService } from './rls-realtime.service';
import { RLS_API } from '../constants/rls-config.constants';
import {
  RlsApiMeta,
  RlsNotification,
  RlsNotificationEvent,
  RlsNotificationsQuery,
} from '../interfaces';
import {
  IdempotencyState,
  applyOnce,
  createIdempotencyState,
} from '../utils/idempotency.util';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Notification inbox service.
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton (`providedIn: 'root'`) quản lý **hộp thư notification** cho
 * `RlsHeaderComponent` (chuông + badge) và `NotificationsPage`. Mirror cấu trúc
 * `RlsFeedService`: danh sách + con trỏ phân trang cursor + cờ loading/hasMore,
 * cộng thêm **bộ đếm chưa đọc** (`unreadCount$`) cho badge. Service KHÔNG vẽ UI
 * và KHÔNG biết base URL (host lấy từ `API_URL` qua `RlsApiService`, R14.3); mọi
 * đường dẫn lấy từ `RLS_API` (single source of truth) — không hardcode URL.
 *
 * Ba nhiệm vụ (Requirement 9):
 *  1. **Inbox cursor-paginated** (R9.1) — {@link loadInbox} nạp trang đầu theo
 *     `GET /notifications?cursor=`; {@link loadMore} nối trang kế bằng
 *     `meta.nextCursor`. Cursor (không OFFSET) ổn định khi notification realtime
 *     chèn liên tục (design.md §6.9, §15 performance).
 *  2. **Realtime prepend idempotent + unread** (R9.2) — service tự subscribe
 *     {@link RlsRealtimeService.notification$} (đã khử trùng theo `event.id` ở
 *     transport, và khử trùng lần nữa ở đây qua `applyOnce` — Property 9). Mỗi
 *     `.NotificationReceived` trên `private-user.{userId}` được **prepend** vào
 *     đầu inbox đúng một lần và **tăng `unreadCount$`** (notification mới luôn
 *     chưa đọc). Loose coupling: notification service phụ thuộc một chiều vào
 *     transport (`notification$` stream public) — `RlsRealtimeService` KHÔNG
 *     biết tới service này (tránh phụ thuộc vòng).
 *  3. **Đánh dấu đã đọc** (R9.5) — {@link markRead} (`POST /notifications/{id}
 *     /read`) và {@link markAllRead} (`POST /notifications/read-all`) cập nhật
 *     lạc quan trạng thái đọc + giảm `unreadCount$` ngay trên client rồi gọi
 *     API; lỗi → rollback. Read-state được persist ở backend (R9.5).
 *
 * Kênh `private-user.{userId}` được subscribe + auth (Sanctum tại
 * `/api/broadcasting/auth`, R9.3) bên trong `RlsRealtimeService`
 * (`subscribeUserChannel`) — service này chỉ tiêu thụ delta đã phát ra, giữ
 * tách bạch transport / domain.
 *
 * _Requirements: 9.1, 9.2, 9.5_
 * _Design: 9.4 Core services — RlsNotificationService; 6.9 Notifications; 7.3 NotificationReceived; 3.3 idempotency_
 */
@Injectable({ providedIn: 'root' })
export class RlsNotificationService implements OnDestroy {
  private readonly api = inject(RlsApiService);
  private readonly realtime = inject(RlsRealtimeService);

  /** Danh sách notification của inbox (đã prepend delta realtime / dedupe). */
  readonly notifications$ = new BehaviorSubject<RlsNotification[]>([]);

  /** Số notification chưa đọc — cho badge chuông ở header (R9.2). */
  readonly unreadCount$ = new BehaviorSubject<number>(0);

  /** Đang nạp trang (đầu hoặc kế tiếp) — cho spinner/skeleton. */
  readonly loading$ = new BehaviorSubject<boolean>(false);

  /** Còn trang để `loadMore` hay không (suy từ `meta.nextCursor`). */
  readonly hasMore$ = new BehaviorSubject<boolean>(false);

  /**
   * State inbox bọc idempotency: `value` là mảng notification, `processed` là
   * LRU set các `event.id` đã áp dụng (để prepend đúng một lần — Property 9).
   * Nguồn chân lý nội bộ; `notifications$` luôn phát `value` sau mỗi thay đổi.
   */
  private inboxState: IdempotencyState<RlsNotification[]> =
    createIdempotencyState<RlsNotification[]>([]);

  /** Query của inbox đang hiển thị (limit) — dùng cho `loadMore`/`refresh`. */
  private currentQuery: RlsNotificationsQuery | null = null;

  /** Con trỏ trang kế tiếp; `null` khi đã hết hoặc chưa nạp. */
  private nextCursor: string | null = null;

  /** Subscription tới `realtime.notification$` (auto prepend delta). */
  private readonly realtimeSub: Subscription;

  constructor() {
    // Loose coupling: tiêu thụ stream notification đã khử trùng ở transport.
    // RlsRealtimeService không biết tới service này → không phụ thuộc vòng.
    this.realtimeSub = this.realtime.notification$.subscribe((event) =>
      this.applyNotificationDelta(event),
    );
  }

  // ────────────────────────────── Loading inbox ───────────────────────────────

  /**
   * Nạp **trang đầu** của inbox (R9.1). Reset state hiện tại (kể cả LRU
   * idempotency) vì đây là lần nạp mới, rồi phát danh sách + cập nhật cursor +
   * bộ đếm chưa đọc (`meta.unreadCount` nếu backend trả, ngược lại đếm các item
   * `isRead === false` của trang đầu).
   *
   * @param query `cursor` (bỏ qua ở trang đầu) + `limit` tuỳ chọn.
   * @returns stream các notification của trang đầu.
   */
  loadInbox(query: RlsNotificationsQuery = {}): Observable<RlsNotification[]> {
    this.currentQuery = { ...query, cursor: null };
    this.loading$.next(true);

    return this.api
      .getEnvelope<RlsNotification[]>(
        RLS_API.NOTIFICATIONS,
        this.buildParams(this.currentQuery),
      )
      .pipe(
        map((env) => {
          const items = Array.isArray(env?.data) ? env.data : [];
          this.setCursor((env?.meta?.nextCursor as string | null) ?? null);
          this.resetInbox(items);
          this.setUnread(this.resolveUnread(env?.meta, items));
          return items;
        }),
        finalize(() => this.loading$.next(false)),
      );
  }

  /**
   * Nối **trang kế tiếp** dùng `nextCursor` của trang trước (R9.1). No-op (trả
   * `[]`) nếu chưa nạp inbox hoặc đã hết trang. Trang mới được *append* vào cuối,
   * giữ nguyên LRU idempotency để các delta đã prepend không bị áp lại. Nếu
   * `meta.unreadCount` có trong response thì đồng bộ lại bộ đếm chưa đọc.
   *
   * @returns stream các notification vừa nối thêm (rỗng nếu không còn trang).
   */
  loadMore(): Observable<RlsNotification[]> {
    if (!this.currentQuery || !this.nextCursor) {
      return of([]);
    }
    this.loading$.next(true);
    const query: RlsNotificationsQuery = {
      ...this.currentQuery,
      cursor: this.nextCursor,
    };

    return this.api
      .getEnvelope<RlsNotification[]>(
        RLS_API.NOTIFICATIONS,
        this.buildParams(query),
      )
      .pipe(
        map((env) => {
          const items = Array.isArray(env?.data) ? env.data : [];
          this.setCursor((env?.meta?.nextCursor as string | null) ?? null);
          this.appendItems(items);
          const metaUnread = readUnreadFromMeta(env?.meta);
          if (metaUnread != null) {
            this.setUnread(metaUnread);
          }
          return items;
        }),
        finalize(() => this.loading$.next(false)),
      );
  }

  /** Nạp lại inbox từ đầu (vd pull-to-refresh) — dùng lại `currentQuery`. */
  refresh(): Observable<RlsNotification[]> {
    return this.loadInbox(this.currentQuery ?? {});
  }

  // ─────────────────────────── Realtime prepend (R9.2) ────────────────────────

  /**
   * Áp delta realtime `.NotificationReceived` (design.md §7.3): **prepend**
   * notification mới vào đầu inbox đúng **một lần** theo `event.id` (R9.2,
   * Property 9) và **tăng `unreadCount$`** (notification mới luôn chưa đọc).
   * Vì realtime là *at-least-once* (reconnect/replay có thể lặp event),
   * `applyOnce` đảm bảo cùng một `event.id` áp lại n lần cho ra cùng kết quả như
   * áp một lần — đồng thời bộ đếm chưa đọc chỉ +1 đúng một lần.
   *
   * Được gọi tự động từ subscription tới {@link RlsRealtimeService.notification$}
   * trong constructor; cũng có thể gọi trực tiếp (vd test / push deep-link).
   *
   * No-op nếu event thiếu `id` (không thể khử trùng an toàn).
   */
  applyNotificationDelta(event: RlsNotificationEvent): void {
    if (!event || !event.id) {
      return;
    }
    const before = this.inboxState;
    this.inboxState = applyOnce(before, event.id, (items) =>
      prependNotificationUnique(items, eventToNotification(event)),
    );

    // Chỉ phát + tăng unread khi danh sách thực sự đổi (event mới & không trùng
    // id số đã có) — tránh +1 khi là bản sao realtime hoặc trùng item REST.
    if (this.inboxState.value !== before.value) {
      this.notifications$.next(this.inboxState.value);
      this.bumpUnread(+1);
    }
  }

  // ─────────────────────────── Mark read (R9.5) ───────────────────────────────

  /**
   * Đánh dấu MỘT notification đã đọc (`POST /notifications/{id}/read`, R9.5) với
   * cập nhật lạc quan: đặt `isRead = true` và `unreadCount - 1` (kẹp ≥ 0) ngay,
   * rồi gọi API. No-op nếu không tìm thấy hoặc đã đọc. Lỗi → rollback.
   */
  markRead(id: number): Observable<unknown> {
    const target = this.inboxState.value.find((n) => n.id === id);
    if (!target || target.isRead) {
      return of(null);
    }
    this.setReadOptimistic(id, true);
    this.bumpUnread(-1);

    return this.api
      .post<unknown>(this.buildPath(RLS_API.NOTIFICATION_READ, id), {})
      .pipe(
        catchError((err) => {
          this.setReadOptimistic(id, false);
          this.bumpUnread(+1);
          return throwError(() => err);
        }),
      );
  }

  /**
   * Đánh dấu TẤT CẢ đã đọc (`POST /notifications/read-all`, R9.5) với cập nhật
   * lạc quan: đặt `isRead = true` cho mọi item và `unreadCount = 0` ngay, rồi
   * gọi API. Lỗi → rollback về snapshot trước đó.
   */
  markAllRead(): Observable<unknown> {
    const previous = this.inboxState.value;
    const previousUnread = this.unreadCount$.getValue();
    if (previousUnread === 0 && previous.every((n) => n.isRead)) {
      return of(null);
    }
    this.setAllRead();
    this.setUnread(0);

    return this.api.post<unknown>(RLS_API.NOTIFICATIONS_READ_ALL, {}).pipe(
      catchError((err) => {
        this.replaceItems(previous);
        this.setUnread(previousUnread);
        return throwError(() => err);
      }),
    );
  }

  // ─────────────────────────────── Accessors ──────────────────────────────────

  /** Danh sách notification hiện tại (đồng bộ). */
  getNotifications(): RlsNotification[] {
    return this.inboxState.value;
  }

  /** Số chưa đọc hiện tại (đồng bộ). */
  getUnreadCount(): number {
    return this.unreadCount$.getValue();
  }

  /** Còn trang để nạp tiếp hay không (đồng bộ). */
  hasMore(): boolean {
    return this.nextCursor != null;
  }

  /** Con trỏ trang kế tiếp hiện tại (hoặc `null`). */
  getNextCursor(): string | null {
    return this.nextCursor;
  }

  /** Dọn toàn bộ state inbox (vd logout) — reset items, cursor, query, unread. */
  reset(): void {
    this.currentQuery = null;
    this.setCursor(null);
    this.resetInbox([]);
    this.setUnread(0);
  }

  ngOnDestroy(): void {
    this.realtimeSub.unsubscribe();
    this.notifications$.complete();
    this.unreadCount$.complete();
    this.loading$.complete();
    this.hasMore$.complete();
  }

  // ─────────────────────────── Private: state helpers ─────────────────────────

  /** Thay toàn bộ inbox + reset LRU idempotency (inbox mới → cho phép áp lại delta). */
  private resetInbox(items: RlsNotification[]): void {
    this.inboxState = createIdempotencyState<RlsNotification[]>(items.slice());
    this.notifications$.next(this.inboxState.value);
  }

  /** Nối các notification vào cuối inbox (giữ LRU idempotency), khử trùng theo `id`. */
  private appendItems(items: RlsNotification[]): void {
    if (items.length === 0) {
      return;
    }
    const existingIds = new Set(this.inboxState.value.map((n) => n.id));
    const fresh = items.filter((n) => !existingIds.has(n.id));
    if (fresh.length === 0) {
      return;
    }
    this.inboxState = {
      ...this.inboxState,
      value: [...this.inboxState.value, ...fresh],
    };
    this.notifications$.next(this.inboxState.value);
  }

  /** Thay nguyên danh sách (giữ LRU idempotency) — dùng cho rollback read-all. */
  private replaceItems(items: RlsNotification[]): void {
    this.inboxState = { ...this.inboxState, value: items.slice() };
    this.notifications$.next(this.inboxState.value);
  }

  /** Đặt `isRead` cho một notification khớp `id`; phát lại stream nếu có đổi. */
  private setReadOptimistic(id: number, isRead: boolean): void {
    const items = this.inboxState.value;
    const index = items.findIndex((n) => n.id === id);
    if (index < 0 || items[index].isRead === isRead) {
      return;
    }
    const next = items.slice();
    next[index] = { ...items[index], isRead };
    this.inboxState = { ...this.inboxState, value: next };
    this.notifications$.next(this.inboxState.value);
  }

  /** Đặt `isRead = true` cho tất cả item (read-all lạc quan). */
  private setAllRead(): void {
    const next = this.inboxState.value.map((n) =>
      n.isRead ? n : { ...n, isRead: true },
    );
    this.inboxState = { ...this.inboxState, value: next };
    this.notifications$.next(this.inboxState.value);
  }

  /** Cập nhật cursor + cờ `hasMore$`. */
  private setCursor(cursor: string | null): void {
    this.nextCursor = cursor;
    this.hasMore$.next(cursor != null);
  }

  /** Đặt bộ đếm chưa đọc (kẹp ≥ 0). */
  private setUnread(count: number): void {
    this.unreadCount$.next(Math.max(0, Math.trunc(count)));
  }

  /** Cộng/trừ bộ đếm chưa đọc (kẹp ≥ 0). */
  private bumpUnread(delta: number): void {
    this.setUnread(this.unreadCount$.getValue() + delta);
  }

  /** Bộ đếm chưa đọc cho trang đầu: ưu tiên `meta.unreadCount`, fallback đếm item. */
  private resolveUnread(
    meta: RlsApiMeta | undefined,
    items: RlsNotification[],
  ): number {
    const metaUnread = readUnreadFromMeta(meta);
    if (metaUnread != null) {
      return metaUnread;
    }
    return items.reduce((acc, n) => (n.isRead ? acc : acc + 1), 0);
  }

  /** Thay `:id` trong template path (vd `/notifications/:id/read`). */
  private buildPath(template: string, id: number | string): string {
    return template.replace(':id', String(id));
  }

  /** Dựng query params cho `GET /notifications` (cursor/limit). */
  private buildParams(query: RlsNotificationsQuery): Record<string, unknown> {
    return {
      cursor: query.cursor ?? undefined,
      limit: query.limit,
    };
  }
}

// ── module-level pure helpers (export để unit-test trực tiếp) ────────────────

/**
 * Prepend `incoming` vào đầu mảng, khử trùng theo `id` số khi `id > 0`: nếu một
 * notification cùng `id` đã tồn tại (vd đã nạp qua REST) thì giữ nguyên mảng
 * (không thêm, không dời chỗ). Với realtime delta không mang `id` số (`id <= 0`)
 * thì luôn prepend — tính idempotent vẫn được bảo đảm bởi `applyOnce` theo
 * `event.id` (uuid) ở tầng gọi.
 */
export function prependNotificationUnique(
  items: RlsNotification[],
  incoming: RlsNotification,
): RlsNotification[] {
  if (incoming.id > 0 && items.some((n) => n.id === incoming.id)) {
    return items;
  }
  return [incoming, ...items];
}

/**
 * Ánh xạ `.NotificationReceived` (design.md §7.3) → `RlsNotification` tối thiểu
 * để render trong inbox. Event realtime KHÔNG mang `userId`/`isRead` và có thể
 * không mang `id` số (DB id) — ta cố trích `id` số từ `data.notificationId` /
 * `data.id` nếu có (để `markRead` dùng được), ngược lại để `0`. Notification
 * mới qua realtime luôn `isRead = false`.
 */
export function eventToNotification(
  event: RlsNotificationEvent,
): RlsNotification {
  const data = event.data ?? {};
  return {
    id: extractNotificationId(data),
    userId: 0,
    type: event.type,
    title: event.title,
    body: event.body,
    data,
    geohash6: null,
    isRead: false,
    createdAt: event.createdAt,
  };
}

/**
 * Trích `id` số (DB id) từ payload `data` của notification event nếu có
 * (`notificationId` hoặc `id`); ngược lại trả `0` (chưa biết). Chấp nhận cả
 * number lẫn chuỗi số.
 */
export function extractNotificationId(data: Record<string, unknown>): number {
  const raw = data['notificationId'] ?? data['id'];
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

/**
 * Đọc số chưa đọc từ `meta` của response (`unreadCount` hoặc `unread`) nếu là
 * số hữu hạn; ngược lại trả `null` (backend không cung cấp → caller tự đếm).
 */
export function readUnreadFromMeta(meta: RlsApiMeta | undefined): number | null {
  if (!meta) {
    return null;
  }
  const raw = meta['unreadCount'] ?? meta['unread'];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.trunc(raw));
  }
  return null;
}
