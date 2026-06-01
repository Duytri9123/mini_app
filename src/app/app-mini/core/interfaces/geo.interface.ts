/**
 * REALTIME LOCAL SOCIAL (app-mini) — Shared geographic primitives.
 *
 * Single source of truth cho các kiểu hình học địa lý dùng chung giữa
 *  - utils thuần (`distance.util` ↔ `LatLng`, `geohash.util` ↔ `GeoBounds`/`Bbox`),
 *  - services (`RlsMapService` giữ state center/zoom/bbox — design.md §9.4,
 *    `RlsGeolocationService` trả vị trí — design.md §9.4),
 *  - components bản đồ (`RlsHeatLayerComponent`, `RlsMapMarkerComponent`...).
 *
 * Các util lõi (`core/utils`) cố tình giữ alias cục bộ tối giản (`LatLng`,
 * `GeoBounds`, `Bbox`) để hàm thuần không phụ thuộc barrel khi property-test;
 * những alias đó **tương thích cấu trúc** với các kiểu ở đây, nên giá trị di
 * chuyển tự do giữa util ↔ service ↔ component mà không cần ép kiểu. Đây là
 * định nghĩa chuẩn (canonical) cho tầng service/component.
 *
 * Prefix `Rls` để không xung đột với `bro-jet` (`Bj`) / dự án cũ.
 */

/**
 * Toạ độ địa lý `(lat, lng)` theo WGS-84 (độ).
 * Bất biến hợp lệ: `-90 <= lat <= 90`, `-180 <= lng <= 180`.
 * Tương thích cấu trúc với `LatLng` trong `distance.util.ts`.
 */
export interface RlsLatLng {
  lat: number;
  lng: number;
}

/**
 * Bounding box địa lý canh trục (axis-aligned) cho một ô geohash hoặc viewport.
 * Bất biến cho bbox hợp lệ: `minLat <= maxLat` và `minLng <= maxLng`.
 * Tương thích cấu trúc với `GeoBounds` trong `geohash.util.ts`.
 */
export interface RlsGeoBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/** Bbox viewport — alias của {@link RlsGeoBounds} cho dễ đọc (khớp `Bbox` ở `geohash.util`). */
export type RlsBbox = RlsGeoBounds;

/**
 * Trạng thái viewport của bản đồ — đầu vào để chọn geohash precision theo zoom
 * và để diff subscribe/unsubscribe kênh realtime theo vùng (design.md §3.1, §9.4).
 * `RlsMapService` phát state này qua `BehaviorSubject` (mirror `BjMapService`).
 */
export interface RlsViewport {
  /** Tâm bản đồ hiện tại. */
  center: RlsLatLng;
  /** Mức zoom hiện tại (>= 0). */
  zoom: number;
  /** Khung nhìn hiện tại — dùng để clamp truy vấn map/feed/story về bbox. */
  bounds: RlsBbox;
}

/**
 * Kết quả lấy vị trí thiết bị (`RlsGeolocationService`, design.md §9.4).
 * `accuracyM` là sai số ước lượng (m); `fallback=true` khi đã rơi về
 * `home_geohash`/tâm mặc định do từ chối/không có quyền vị trí (R2.3).
 */
export interface RlsGeoPosition extends RlsLatLng {
  accuracyM?: number;
  /** ISO8601 thời điểm đo. */
  timestamp?: string;
  /** `true` nếu là vị trí dự phòng (không phải GPS thực). */
  fallback?: boolean;
}
