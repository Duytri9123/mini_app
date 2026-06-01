import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  share,
} from 'rxjs/operators';

import {
  RlsBbox,
  RlsHeatPoint,
  RlsLatLng,
  RlsMapMarker,
  RlsMapMarkerVisualState,
  RlsViewport,
} from '../interfaces';
import {
  RLS_GEOHASH_PRECISION,
  RLS_HOT_THRESHOLD,
  RLS_MAP,
  RLS_REALTIME,
  RLS_ZOOM_PRECISION_BREAKPOINTS,
} from '../constants/rls-config.constants';
import {
  GeohashCoverageError,
  MAX_PRECISION,
  MIN_PRECISION,
  coverBbox,
} from '../utils/geohash.util';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Map state service.
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirror `BjMapService`: singleton (`providedIn: 'root'`) giữ state của bản đồ
 * toàn màn hình bằng `BehaviorSubject` — center / zoom / bbox / markers / heat.
 * `HomeMapPage` và các map component đọc state qua các stream này, ghi state qua
 * các setter; service KHÔNG gọi HTTP và KHÔNG vẽ map (không phụ thuộc Leaflet/
 * MapLibre) — chỉ là nguồn chân lý (single source of truth) cho trạng thái view.
 *
 * Khác `BjMapService` (vốn chỉ có center + markers cho 1 màn trạm) ở ba điểm có
 * chủ đích cho bản đồ realtime:
 *  1. **Debounced viewport change** — khi user pan/zoom, page đẩy viewport mới
 *     qua {@link setViewport}; service gộp (debounce `RLS_MAP.VIEWPORT_DEBOUNCE_MS`)
 *     và phát {@link viewportChange$} để page refetch markers/heat theo bbox mới
 *     (R2.2, R2.6) — tránh bão request khi kéo bản đồ liên tục.
 *  2. **Zoom → geohash precision** — {@link precision$} / {@link precisionForZoom}
 *     chọn độ chi tiết geohash theo zoom (R4.5) dựa trên
 *     `RLS_ZOOM_PRECISION_BREAKPOINTS`; {@link geohashCellsForViewport} dùng
 *     `coverBbox` (reuse `geohash.util`) với fallback hạ precision khi vượt cap
 *     ô (`RLS_REALTIME.MAX_VIEWPORT_CELLS`, design.md §3.1).
 *  3. **Live marker activity** — {@link upsertMarker} / {@link setMarkerActivityCount}
 *     cho phép cập nhật một marker không reload toàn bộ; cường độ hoạt động đổi
 *     → suy ra `visualState` (pulse/glow) (R3.3).
 *
 * Không hardcode URL ở đây (R14.3) — service thuần state. Prefix `Rls` để không
 * xung đột `bro-jet`.
 *
 * _Requirements: 2.2, 2.6, 3.3, 4.5_
 * _Design: 9.4 Core services — RlsMapService; 3.1 viewport channels; 4.5 precision_
 */
@Injectable({ providedIn: 'root' })
export class RlsMapService {
  // ───────────────────────────────── Map state ─────────────────────────────────

  /** Tâm bản đồ hiện tại (mặc định Hà Nội — fallback khi chưa có vị trí, R2.3). */
  readonly center$ = new BehaviorSubject<RlsLatLng>({
    lat: RLS_MAP.DEFAULT_LAT,
    lng: RLS_MAP.DEFAULT_LNG,
  });

  /** Mức zoom hiện tại của bản đồ (>= 0). */
  readonly zoom$ = new BehaviorSubject<number>(RLS_MAP.DEFAULT_ZOOM);

  /**
   * Bounding box của viewport hiện tại — `null` cho tới khi map render lần đầu
   * và báo bounds thực (lúc đó mới biết khung nhìn để clamp truy vấn map/feed).
   */
  readonly bounds$ = new BehaviorSubject<RlsBbox | null>(null);

  /** Markers đang hiển thị trên bản đồ (đã chuẩn hoá để render — design.md §9.3). */
  readonly markers$ = new BehaviorSubject<RlsMapMarker[]>([]);

  /** Điểm heat (mỗi ô geohash) sau khi đã decay — input cho heat layer. */
  readonly heatPoints$ = new BehaviorSubject<RlsHeatPoint[]>([]);

  // ───────────────────────────── Derived streams ──────────────────────────────

  /**
   * Geohash precision tương ứng zoom hiện tại (R4.5) — phát lại khi zoom đổi
   * mức breakpoint. Dùng cho việc chọn `precision` truy vấn heatmap và độ chi
   * tiết kênh realtime (design.md §3.1, §4.5).
   */
  readonly precision$: Observable<number> = this.zoom$.pipe(
    map((zoom) => this.precisionForZoom(zoom)),
    distinctUntilChanged(),
  );

  /**
   * Snapshot viewport hiện tại (center + zoom + bounds) — chỉ phát khi đã biết
   * bounds thực. Tiện cho consumer cần cả ba giá trị một lúc (vd diff kênh).
   */
  readonly viewport$: Observable<RlsViewport> = combineLatest([
    this.center$,
    this.zoom$,
    this.bounds$,
  ]).pipe(
    // Bỏ qua khi chưa có bounds (map chưa render xong) — viewport chưa hợp lệ.
    filter(([, , bounds]) => bounds !== null),
    map(([center, zoom, bounds]) => ({
      center,
      zoom,
      bounds: bounds as RlsBbox,
    })),
    distinctUntilChanged(rlsViewportEquals),
  );

  /**
   * Nguồn viewport thô do page đẩy vào mỗi lần pan/zoom (không debounce).
   * Giữ private để chỉ {@link setViewport} được phát — tránh nhiều đường ghi.
   */
  private readonly viewportInput$ = new Subject<RlsViewport>();

  /**
   * **Viewport change đã debounce** (R2.6) — phát viewport "ổn định" sau khi
   * user dừng kéo/zoom `RLS_MAP.VIEWPORT_DEBOUNCE_MS` ms. Page subscribe stream
   * này để refetch markers/heat cho bbox mới (R2.2) và chọn lại precision (R4.5).
   *
   * `share()` để debounce chạy MỘT lần dù nhiều subscriber (multicast) — không
   * nhân bản pipeline gây refetch trùng.
   */
  readonly viewportChange$: Observable<RlsViewport> = this.viewportInput$.pipe(
    debounceTime(RLS_MAP.VIEWPORT_DEBOUNCE_MS),
    distinctUntilChanged(rlsViewportEquals),
    share(),
  );

  // ─────────────────────────────── State setters ──────────────────────────────

  /** Cập nhật tâm bản đồ (vd recenter theo vị trí thật khi có quyền — R2.1). */
  updateCenter(lat: number, lng: number): void {
    this.center$.next({ lat, lng });
  }

  /** Cập nhật mức zoom hiện tại. */
  updateZoom(zoom: number): void {
    this.zoom$.next(zoom);
  }

  /** Cập nhật bounding box viewport (map báo `moveend`). */
  updateBounds(bounds: RlsBbox): void {
    this.bounds$.next(bounds);
  }

  /**
   * Đặt toàn bộ viewport (center + zoom + bbox) trong một lần khi user pan/zoom
   * và đẩy vào luồng debounce → {@link viewportChange$}. Đây là điểm GHI DUY
   * NHẤT kích hoạt refetch; các setter lẻ ở trên chỉ cập nhật state mà không
   * tạo sự kiện refetch (vd recenter mượt không cần refetch ngay).
   */
  setViewport(viewport: RlsViewport): void {
    this.center$.next(viewport.center);
    this.zoom$.next(viewport.zoom);
    this.bounds$.next(viewport.bounds);
    this.viewportInput$.next(viewport);
  }

  // ─────────────────────────────── Markers / heat ─────────────────────────────

  /** Thay toàn bộ danh sách marker (vd sau khi load snapshot theo viewport). */
  updateMarkers(markers: RlsMapMarker[]): void {
    this.markers$.next(markers);
  }

  /**
   * Thêm mới hoặc cập nhật MỘT marker theo `id` (không reload toàn bộ) — phục vụ
   * delta realtime `marker.upserted` (R3.6). Nếu đã tồn tại thì merge để giữ các
   * field cũ không bị mất; `visualState` được suy lại từ `activityCount` (R3.3).
   */
  upsertMarker(marker: RlsMapMarker): void {
    const current = this.markers$.getValue();
    const index = current.findIndex((m) => m.id === marker.id);
    const merged =
      index >= 0 ? { ...current[index], ...marker } : { ...marker };
    merged.visualState = deriveVisualState(merged);

    if (index >= 0) {
      const next = current.slice();
      next[index] = merged;
      this.markers$.next(next);
    } else {
      this.markers$.next([...current, merged]);
    }
  }

  /**
   * Cập nhật cường độ hoạt động của một marker → đổi pulse/glow (R3.3). Counter
   * không bao giờ âm (R4.6) nên giá trị âm được kẹp về 0. No-op nếu không tìm
   * thấy marker (delta cho marker chưa nằm trong viewport).
   */
  setMarkerActivityCount(markerId: string, activityCount: number): void {
    const current = this.markers$.getValue();
    const index = current.findIndex((m) => m.id === markerId);
    if (index < 0) {
      return;
    }
    const safeCount = Number.isFinite(activityCount)
      ? Math.max(0, activityCount)
      : 0;
    const updated: RlsMapMarker = { ...current[index], activityCount: safeCount };
    updated.visualState = deriveVisualState(updated);

    const next = current.slice();
    next[index] = updated;
    this.markers$.next(next);
  }

  /** Xoá một marker theo `id` (vd nội dung bị gỡ). */
  removeMarker(markerId: string): void {
    const current = this.markers$.getValue();
    const next = current.filter((m) => m.id !== markerId);
    if (next.length !== current.length) {
      this.markers$.next(next);
    }
  }

  /** Thay toàn bộ điểm heat (vd sau khi load heatmap theo viewport). */
  updateHeatPoints(heatPoints: RlsHeatPoint[]): void {
    this.heatPoints$.next(heatPoints);
  }

  /** Dọn state về rỗng (markers + heat) — giữ center/zoom/bounds. */
  clear(): void {
    this.markers$.next([]);
    this.heatPoints$.next([]);
  }

  // ───────────────────────── Zoom → geohash precision ─────────────────────────

  /**
   * Chọn geohash precision phù hợp mức `zoom` (R4.5) theo
   * `RLS_ZOOM_PRECISION_BREAKPOINTS`: zoom thấp → precision thấp (ô lớn), zoom
   * cao → precision cao (ô nhỏ). Kết quả luôn nằm trong [MIN_PRECISION, MAX_PRECISION].
   * Hàm thuần, xác định — uỷ quyền cho {@link selectPrecisionForZoom}.
   */
  precisionForZoom(zoom: number): number {
    return selectPrecisionForZoom(zoom);
  }

  /**
   * Liệt kê các ô geohash phủ viewport (reuse `coverBbox` của `geohash.util`),
   * dùng để chọn kênh realtime / truy vấn heat theo ô (design.md §3.1).
   *
   * Mặc định lấy `bounds` + precision-theo-zoom từ state hiện tại. Nếu cover
   * vượt cap ô (`RLS_REALTIME.MAX_VIEWPORT_CELLS`) → tự **hạ precision** từng bậc
   * tới khi vừa cap (design.md §11.1 "vượt → caller giảm precision"); trả `[]`
   * nếu chưa có bounds hoặc không thể phủ trong cap tới precision tối thiểu.
   */
  geohashCellsForViewport(bbox?: RlsBbox, precision?: number): string[] {
    const box = bbox ?? this.bounds$.getValue();
    if (!box) {
      return [];
    }

    let p = clampPrecision(precision ?? this.precisionForZoom(this.zoom$.getValue()));
    const maxCells = RLS_REALTIME.MAX_VIEWPORT_CELLS;

    // Hạ dần precision tới khi cover vừa cap ô hoặc chạm precision tối thiểu.
    while (p >= MIN_PRECISION) {
      try {
        return coverBbox(box, p, maxCells);
      } catch (err) {
        if (err instanceof GeohashCoverageError && p > MIN_PRECISION) {
          p -= 1;
          continue;
        }
        return [];
      }
    }
    return [];
  }

  // ─────────────────────────────── Sync accessors ─────────────────────────────

  /** Tâm bản đồ hiện tại (đồng bộ). */
  getCenter(): RlsLatLng {
    return this.center$.getValue();
  }

  /** Mức zoom hiện tại (đồng bộ). */
  getZoom(): number {
    return this.zoom$.getValue();
  }

  /** Bbox viewport hiện tại (hoặc `null` nếu map chưa render). */
  getBounds(): RlsBbox | null {
    return this.bounds$.getValue();
  }

  /** Markers hiện tại (đồng bộ). */
  getMarkers(): RlsMapMarker[] {
    return this.markers$.getValue();
  }

  /** Điểm heat hiện tại (đồng bộ). */
  getHeatPoints(): RlsHeatPoint[] {
    return this.heatPoints$.getValue();
  }

  /** Snapshot viewport hiện tại, hoặc `null` nếu chưa có bounds. */
  getViewport(): RlsViewport | null {
    const bounds = this.bounds$.getValue();
    if (!bounds) {
      return null;
    }
    return {
      center: this.center$.getValue(),
      zoom: this.zoom$.getValue(),
      bounds,
    };
  }
}

// ── module-level pure helpers ───────────────────────────────────────────────

/**
 * Chọn geohash precision theo zoom (hàm thuần, export để unit-test trực tiếp).
 * Quét `RLS_ZOOM_PRECISION_BREAKPOINTS` (đã sắp theo `maxZoom` tăng dần) lấy
 * breakpoint đầu tiên có `zoom <= maxZoom`; nếu zoom vượt mọi breakpoint thì
 * dùng precision của breakpoint cuối. Kết quả kẹp về [MIN_PRECISION, MAX_PRECISION].
 */
export function selectPrecisionForZoom(zoom: number): number {
  const z = Number.isFinite(zoom) ? zoom : 0;
  for (const bp of RLS_ZOOM_PRECISION_BREAKPOINTS) {
    if (z <= bp.maxZoom) {
      return clampPrecision(bp.precision);
    }
  }
  const last = RLS_ZOOM_PRECISION_BREAKPOINTS[RLS_ZOOM_PRECISION_BREAKPOINTS.length - 1];
  return clampPrecision(last ? last.precision : RLS_GEOHASH_PRECISION.DEFAULT);
}

/** Kẹp precision về dải hợp lệ [MIN_PRECISION, MAX_PRECISION]. */
function clampPrecision(precision: number): number {
  if (!Number.isFinite(precision)) {
    return RLS_GEOHASH_PRECISION.DEFAULT;
  }
  const rounded = Math.round(precision);
  return Math.min(Math.max(rounded, MIN_PRECISION), MAX_PRECISION);
}

/**
 * Suy `visualState` (pulse/glow) của marker từ `activityCount` (R3.3) — giữ
 * 'selected' nếu caller đã đặt (không ghi đè lựa chọn người dùng). Ngưỡng "hot"
 * mirror `RLS_HOT_THRESHOLD` (design.md §4.3) để client nhất quán với server.
 */
function deriveVisualState(marker: RlsMapMarker): RlsMapMarkerVisualState {
  if (marker.visualState === 'selected') {
    return 'selected';
  }
  const count = marker.activityCount ?? 0;
  if (count >= RLS_HOT_THRESHOLD) {
    return 'hot';
  }
  if (count > 0) {
    return 'active';
  }
  return 'default';
}

/** So sánh hai viewport (center/zoom/bounds) để khử phát trùng. */
function rlsViewportEquals(a: RlsViewport, b: RlsViewport): boolean {
  return (
    a.zoom === b.zoom &&
    a.center.lat === b.center.lat &&
    a.center.lng === b.center.lng &&
    a.bounds.minLat === b.bounds.minLat &&
    a.bounds.minLng === b.bounds.minLng &&
    a.bounds.maxLat === b.bounds.maxLat &&
    a.bounds.maxLng === b.bounds.maxLng
  );
}
