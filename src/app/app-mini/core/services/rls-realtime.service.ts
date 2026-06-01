import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import Echo from 'laravel-echo';
import type { EchoOptions } from 'laravel-echo';
import Pusher from 'pusher-js';

import { API_URL, BASE_URL, environment } from 'src/environments/environment';
import {
  RLS_API,
  RLS_CHANNELS,
  RLS_REALTIME,
} from '../constants/rls-config.constants';
import {
  LruSet,
  createLruSet,
  lruAdd,
  lruHas,
} from '../utils/idempotency.util';
import {
  RlsActivityCounterEvent,
  RlsNewFeedItemEvent,
  RlsNewMarkerEvent,
  RlsNotificationEvent,
  RlsRealtimeEvent,
} from '../interfaces';
import { RlsAuthService } from './rls-auth.service';
import { RlsMapService } from './rls-map.service';

/**
 * Trạng thái kết nối realtime đã đơn giản hoá cho UI (design.md §14 error
 * handling): khi `disconnected` → page hiển thị badge "đang kết nối lại" và
 * tiếp tục dùng dữ liệu REST cuối cùng (R12.3).
 */
export type RlsRealtimeStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Realtime transport service (Echo + Reverb).
 * ─────────────────────────────────────────────────────────────────────────────
 * Khởi tạo `laravel-echo` + `pusher-js` trỏ tới **Laravel Reverb** (giao thức
 * Pusher) và là điểm vào DUY NHẤT cho realtime của module: subscribe/unsubscribe
 * kênh theo viewport, khử trùng event (idempotency), và phát tín hiệu resync khi
 * kết nối phục hồi. Mirror cách `bro-jet` dùng Pusher (xem
 * `bj-support-chat.page` / `WalletRealtimeService`) nhưng nâng lên service lõi
 * `providedIn: 'root'` (design.md §9.4) vì app-mini realtime là xuyên suốt.
 *
 * Quyết định thiết kế chính:
 *  1. **Env-driven, không hardcode URL** (R14.3, R14.6) — `appKey` lấy từ
 *     `environment.reverb`; `wsHost` suy ra từ `BASE_URL` (cùng host admin) khi
 *     không cấu hình tường minh; `authEndpoint` = `${API_URL}/broadcasting/auth`
 *     (Sanctum, design.md §15.2). Bearer token đính kèm trong `auth.headers`.
 *  2. **Viewport channel diff + hard cap** (R12.1, R12.2) — chỉ subscribe các
 *     kênh `area.{geohash}` phủ viewport hiện tại (lấy ô từ
 *     {@link RlsMapService.geohashCellsForViewport}) cộng kênh private
 *     `private-user.{userId}`. Khi viewport đổi → tính tập kênh mong muốn và
 *     **diff** (chỉ subscribe ô mới, unsubscribe ô rời viewport), giới hạn cứng
 *     `RLS_REALTIME.MAX_VIEWPORT_CELLS` để không bùng nổ số kênh.
 *  3. **Idempotency LRU** (R3.6, R5.4, design.md §3.3 Property 9) — realtime là
 *     at-least-once; mỗi event mang `id` (uuid). Service giữ một LRU set các
 *     `id` đã xử lý (reuse `idempotency.util`) và CHỈ phát event lần đầu, chống
 *     render trùng do reconnect/replay.
 *  4. **Reconnect resync hook** (R12.4) — bind `pusher:connection` state; khi
 *     chuyển sang `connected` LẠI (sau lần đầu) → phát {@link resync$} để page
 *     gọi `/map/bootstrap|snapshot` đối soát delta lỡ và đồng bộ lại viewport.
 *
 * Service KHÔNG vẽ map, KHÔNG gọi REST nghiệp vụ — chỉ là transport delta. Các
 * consumer (HomeMapPage, RlsFeedService, RlsNotificationService) subscribe các
 * stream event đã khử trùng bên dưới.
 *
 * _Requirements: 12.1, 12.2, 14.6, 3.6, 5.4_
 * _Design: 3.1 channels, 3.3 idempotency/reconnect, 7 event contracts, 9.4 core services_
 */
@Injectable({ providedIn: 'root' })
export class RlsRealtimeService implements OnDestroy {
  // ─────────────────────────────── Event streams ──────────────────────────────
  // Các stream đã khử trùng (idempotency) — phát đúng MỘT lần cho mỗi event id.

  /** `.NewMarker` trên `area.{geohash}` — marker mới (post/checkin/story) (R3.6). */
  readonly newMarker$ = new Subject<RlsNewMarkerEvent>();

  /** `.ActivityCounterUpdated` trên `area.{geohash}` — counter/heat debounced (R4.7). */
  readonly activityCounter$ = new Subject<RlsActivityCounterEvent>();

  /** `.NewFeedItem` trên `area.{geohash}` — bài mới cho local feed khu vực (R5.4). */
  readonly newFeedItem$ = new Subject<RlsNewFeedItemEvent>();

  /** `.NotificationReceived` trên `private-user.{userId}` — notification riêng (R9.2). */
  readonly notification$ = new Subject<RlsNotificationEvent>();

  /**
   * Tín hiệu resync khi kết nối WebSocket phục hồi (R12.4). Page subscribe để
   * gọi lại snapshot REST và đối soát các delta đã lỡ trong lúc mất kết nối.
   */
  readonly resync$ = new Subject<void>();

  /** Trạng thái kết nối realtime (R12.3) — UI suy ra badge "live/paused". */
  readonly status$ = new BehaviorSubject<RlsRealtimeStatus>('disconnected');

  // ──────────────────────────────── Internals ─────────────────────────────────

  private readonly auth = inject(RlsAuthService);
  private readonly mapService = inject(RlsMapService);

  /** Instance Echo (null khi chưa `connect()` hoặc đã `disconnect()`). */
  private echo: Echo<'reverb'> | null = null;

  /** Tên (wire) các kênh `area.*` đang subscribe — dùng để diff viewport. */
  private readonly areaChannelNames = new Set<string>();

  /** Tên kênh private đã subscribe cho user hiện tại (`user.{id}`), hoặc null. */
  private userChannelArg: string | null = null;

  /** LRU set các event id đã xử lý — chống render trùng (Property 9). */
  private processed: LruSet = createLruSet(RLS_REALTIME.IDEMPOTENCY_LRU_SIZE);

  /** `true` sau lần `connected` đầu tiên — phân biệt connect đầu vs reconnect. */
  private hasConnectedBefore = false;

  /** Subscription tới `mapService.viewportChange$` (auto diff kênh theo viewport). */
  private viewportSub: Subscription | null = null;

  // ──────────────────────────────── Lifecycle ─────────────────────────────────

  /**
   * Khởi tạo Echo→Reverb (idempotent — gọi lại khi đã kết nối là no-op) và bắt
   * đầu lắng nghe: bind trạng thái kết nối (reconnect hook), subscribe kênh
   * private user, auto diff kênh `area.*` theo `viewportChange$`, và đồng bộ
   * kênh viewport lần đầu theo bounds hiện tại.
   */
  connect(): void {
    if (this.echo) {
      return;
    }

    this.status$.next('connecting');
    this.echo = new Echo<'reverb'>(this.buildEchoOptions());

    this.bindConnectionState();
    this.subscribeUserChannel();

    // Auto diff kênh area theo viewport (R12.2). `viewportChange$` đã debounce
    // trong RlsMapService nên không bão re-subscribe khi user kéo bản đồ.
    this.viewportSub = this.mapService.viewportChange$.subscribe(() =>
      this.syncViewportChannels(),
    );

    // Đồng bộ ngay theo viewport hiện tại (nếu map đã có bounds).
    this.syncViewportChannels();
  }

  /**
   * Ngắt realtime hoàn toàn: rời mọi kênh, huỷ Echo, dọn state diff + cờ kết
   * nối. An toàn khi gọi nhiều lần. Không complete các Subject để consumer vẫn
   * có thể `connect()` lại trong cùng phiên app.
   */
  disconnect(): void {
    this.viewportSub?.unsubscribe();
    this.viewportSub = null;

    if (this.echo) {
      try {
        this.echo.leaveAllChannels();
        this.echo.disconnect();
      } catch {
        // Bỏ qua lỗi teardown — vẫn dọn state phía client bên dưới.
      }
    }

    this.echo = null;
    this.areaChannelNames.clear();
    this.userChannelArg = null;
    this.hasConnectedBefore = false;
    this.status$.next('disconnected');
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.newMarker$.complete();
    this.activityCounter$.complete();
    this.newFeedItem$.complete();
    this.notification$.complete();
    this.resync$.complete();
    this.status$.complete();
  }

  // ─────────────────────────── Viewport channel diff ──────────────────────────

  /**
   * Đồng bộ tập kênh `area.{geohash}` với viewport hiện tại (R12.1, R12.2).
   * Lấy ô geohash phủ viewport từ {@link RlsMapService.geohashCellsForViewport}
   * (đã hạ precision khi vượt cap), áp **giới hạn cứng**
   * `RLS_REALTIME.MAX_VIEWPORT_CELLS`, rồi **diff**:
   *  - unsubscribe kênh đang giữ nhưng không còn trong tập mong muốn;
   *  - subscribe + bind listener cho ô mới xuất hiện trong viewport.
   *
   * No-op nếu chưa `connect()`. Có thể truyền `cells` tường minh (vd resync sau
   * khi viewport đổi lúc mất kết nối); mặc định tính từ state map hiện tại.
   */
  syncViewportChannels(cells?: string[]): void {
    if (!this.echo) {
      return;
    }

    const sourceCells = cells ?? this.mapService.geohashCellsForViewport();
    const desired = new Set(
      // Giới hạn cứng số ô → số kênh area (R12.1; design.md §3.1 "tối đa 12 ô").
      sourceCells
        .slice(0, RLS_REALTIME.MAX_VIEWPORT_CELLS)
        .map((gh) => RLS_CHANNELS.area(gh)),
    );

    // Unsubscribe các kênh đã rời viewport.
    for (const name of [...this.areaChannelNames]) {
      if (!desired.has(name)) {
        this.leaveAreaChannel(name);
      }
    }

    // Subscribe các kênh mới vào viewport.
    for (const name of desired) {
      if (!this.areaChannelNames.has(name)) {
        this.joinAreaChannel(name);
      }
    }
  }

  /** Subscribe MỘT kênh area public + bind 3 event contract của khu vực (design.md §7.1). */
  private joinAreaChannel(name: string): void {
    if (!this.echo) {
      return;
    }
    const channel = this.echo.channel(name);
    channel.listen('.NewMarker', (event: RlsNewMarkerEvent) =>
      this.emitIfNew(this.newMarker$, event),
    );
    channel.listen('.ActivityCounterUpdated', (event: RlsActivityCounterEvent) =>
      this.emitIfNew(this.activityCounter$, event),
    );
    channel.listen('.NewFeedItem', (event: RlsNewFeedItemEvent) =>
      this.emitIfNew(this.newFeedItem$, event),
    );
    this.areaChannelNames.add(name);
  }

  /** Rời MỘT kênh area (gỡ listener + unsubscribe trên pusher). */
  private leaveAreaChannel(name: string): void {
    try {
      this.echo?.leaveChannel(name);
    } catch {
      // Bỏ qua — vẫn xoá khỏi set để diff lần sau không kẹt.
    }
    this.areaChannelNames.delete(name);
  }

  // ─────────────────────────── Private user channel ───────────────────────────

  /**
   * Subscribe kênh private `private-user.{userId}` cho user hiện tại (R12.1,
   * R9.2). No-op nếu chưa đăng nhập hoặc đã subscribe đúng kênh đó. Echo tự thêm
   * tiền tố `private-` nên truyền tên đã bỏ tiền tố (`user.{id}`); auth qua
   * `authEndpoint` Sanctum đã cấu hình lúc khởi tạo Echo.
   */
  private subscribeUserChannel(): void {
    const user = this.auth.getCurrentUser();
    if (!this.echo || !user?.id) {
      return;
    }

    const arg = this.toEchoPrivateArg(RLS_CHANNELS.privateUser(user.id));
    if (this.userChannelArg === arg) {
      return;
    }
    this.userChannelArg = arg;

    this.echo
      .private(arg)
      .listen('.NotificationReceived', (event: RlsNotificationEvent) =>
        this.emitIfNew(this.notification$, event),
      );
  }

  // ──────────────────────────── Connection / resync ───────────────────────────

  /**
   * Bind trạng thái kết nối Pusher (`pusher:connection`) để (a) cập nhật
   * {@link status$} cho UI (R12.3), và (b) phát {@link resync$} khi `connected`
   * LẠI sau lần đầu — đây là reconnect hook (R12.4). Bao try/catch vì connector
   * nội bộ có thể chưa sẵn sàng ở môi trường test.
   */
  private bindConnectionState(): void {
    try {
      const connection = this.echo?.connector?.pusher?.connection;
      if (!connection) {
        return;
      }
      connection.bind(
        'state_change',
        (states: { previous: string; current: string }) =>
          this.handleConnectionState(states.current),
      );
    } catch {
      // Không có kết nối thực (vd unit test) — bỏ qua, status giữ 'connecting'.
    }
  }

  /** Cập nhật status + phát resync khi phục hồi kết nối (không phát ở connect đầu). */
  private handleConnectionState(state: string): void {
    this.status$.next(mapConnectionStatus(state));

    if (state === 'connected') {
      if (this.hasConnectedBefore) {
        // Phục hồi sau khi mất kết nối → đối soát viewport + snapshot (R12.4).
        this.syncViewportChannels();
        this.resync$.next();
      }
      this.hasConnectedBefore = true;
    }
  }

  // ─────────────────────────────── Idempotency ────────────────────────────────

  /**
   * Phát `event` qua `subject` CHỈ khi `event.id` chưa từng xử lý (Property 9).
   * Event thiếu `id` (không hợp lệ theo hợp đồng §7) được bỏ qua để không phá
   * đảm bảo khử trùng. Input không bị mutate; LRU set tự evict khi vượt sức chứa.
   */
  private emitIfNew<T extends RlsRealtimeEvent>(
    subject: Subject<T>,
    event: T | null | undefined,
  ): void {
    if (!event || typeof event.id !== 'string' || event.id === '') {
      return;
    }
    if (lruHas(this.processed, event.id)) {
      return; // đã xử lý — bỏ qua bản sao (reconnect/replay).
    }
    this.processed = lruAdd(this.processed, event.id);
    subject.next(event);
  }

  // ───────────────────────────────── Helpers ──────────────────────────────────

  /**
   * Dựng options cho Echo→Reverb từ `environment` (R14.6). `wsHost` suy ra từ
   * `BASE_URL` khi không cấu hình tường minh để không hardcode URL (R14.3).
   */
  private buildEchoOptions(): EchoOptions<'reverb'> & { broadcaster: 'reverb' } {
    const reverb = environment.reverb;
    const token = this.auth.getAccessToken();

    return {
      broadcaster: 'reverb',
      key: reverb.appKey,
      wsHost: this.resolveWsHost(),
      wsPort: reverb.wsPort,
      wssPort: reverb.wssPort,
      forceTLS: reverb.forceTLS,
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
      // Auth kênh private/presence qua Sanctum (design.md §15.2). Token được
      // đính kèm tại đây; RlsAuthInterceptor không can thiệp WS handshake.
      authEndpoint: `${API_URL}${RLS_API.BROADCASTING_AUTH}`,
      auth: {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      // pusher-js client cho Echo (Reverb dùng giao thức Pusher).
      Pusher,
    };
  }

  /** Host WebSocket: ưu tiên `environment.reverb.wsHost`, fallback hostname của `BASE_URL`. */
  private resolveWsHost(): string {
    const configured = (environment.reverb.wsHost ?? '').trim();
    if (configured !== '') {
      return configured;
    }
    try {
      return new URL(BASE_URL).hostname;
    } catch {
      return '';
    }
  }

  /**
   * Chuyển tên kênh dạng wire `private-user.{id}` (từ `RLS_CHANNELS`) về tham số
   * cho `echo.private()` (Echo tự thêm lại tiền tố `private-`). Tránh
   * double-prefix `private-private-user.{id}`.
   */
  private toEchoPrivateArg(wireName: string): string {
    return wireName.replace(/^private-/, '');
  }
}

// ── module-level pure helpers ───────────────────────────────────────────────

/**
 * Ánh xạ trạng thái kết nối Pusher → {@link RlsRealtimeStatus} cho UI.
 * `connecting`/`initialized` → 'connecting'; `connected` → 'connected'; phần
 * còn lại (`unavailable`/`failed`/`disconnected`) → 'disconnected' (R12.3).
 * Hàm thuần, export để unit-test trực tiếp.
 */
export function mapConnectionStatus(state: string): RlsRealtimeStatus {
  switch (state) {
    case 'connected':
      return 'connected';
    case 'connecting':
    case 'initialized':
      return 'connecting';
    default:
      return 'disconnected';
  }
}
