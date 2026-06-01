/**
 * REALTIME LOCAL SOCIAL (app-mini) — Marker (domain) interfaces.
 *
 * Marker "nghiệp vụ" trả từ API (`GET /map/markers`, design.md §6.2) và mang
 * trong sự kiện realtime `NewMarker` (design.md §7.1). Type render trên bản đồ
 * (Leaflet) nằm ở `map-marker.interface.ts`.
 */

/**
 * Loại marker (khớp `NewMarkerEvent.type`, design.md §7.1 và §6.2 Marker System).
 * Bao gồm cả `hot_area`/`user`/`post` ngoài các category địa điểm.
 */
export type RlsMarkerType =
  | 'food'
  | 'cafe'
  | 'event'
  | 'hot_area'
  | 'campus'
  | 'user'
  | 'post';

/** Badge hiển thị trên marker (countdown sự kiện hoặc đếm hoạt động). */
export interface RlsMarkerBadge {
  kind: 'countdown' | 'count';
  value: string;
}

/** Marker nghiệp vụ (nguồn từ backend). */
export interface RlsMarker {
  markerId: string;
  type: RlsMarkerType;
  lat: number;
  lng: number;
  thumbnailUrl?: string;
  label?: string;
  badge?: RlsMarkerBadge;
  /** Cường độ hoạt động → suy ra pulse/glow (design.md §6.2 R3.3). */
  activityCount?: number;
  createdAt?: string; // ISO8601
}

/** Tham số truy vấn marker theo viewport (`GET /map/markers?bbox=&types=`). */
export interface RlsMarkersQuery {
  bbox: string; // "minLng,minLat,maxLng,maxLat"
  types?: RlsMarkerType[];
}
