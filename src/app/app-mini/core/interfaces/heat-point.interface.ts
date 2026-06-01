/**
 * REALTIME LOCAL SOCIAL (app-mini) — Heatmap point interfaces.
 *
 * Ánh xạ GeoJSON heat (design.md §4.4, §6.2 `GET /map/heatmap`) — mỗi ô geohash
 * có score đã decay + category trội. Phục vụ `RlsHeatLayerComponent`
 * (`@Input heatPoints: HeatPoint[]`, design.md §9.3).
 */

/**
 * Category trội của một heat cell (design.md §4.3 phân loại màu).
 * `null` khi chưa xác định category trội (chỉ có tổng score).
 */
export type RlsHeatCategory =
  | 'food'
  | 'cafe'
  | 'event'
  | 'nightlife'
  | 'trend'
  | null;

/** Một điểm heat (1 ô geohash) sau khi đã decay. */
export interface RlsHeatPoint {
  geohash: string;
  lat: number; // tâm ô (centroid)
  lng: number;
  /** Score đã decay; chuẩn hóa (0, 1] khi render (design.md R4.3). */
  score: number;
  category: RlsHeatCategory;
}

/** Tham số truy vấn heatmap theo viewport (`GET /map/heatmap?bbox=&precision=`). */
export interface RlsHeatmapQuery {
  bbox: string; // "minLng,minLat,maxLng,maxLat"
  precision: number; // geohash precision theo zoom
}

/** Snapshot bản đồ (`GET /map/snapshot|bootstrap`) — markers + heat trong viewport. */
export interface RlsMapSnapshot {
  markers: import('./marker.interface').RlsMarker[];
  heatPoints: RlsHeatPoint[];
  hotAreas?: RlsHeatPoint[];
}
