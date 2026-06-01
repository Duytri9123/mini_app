/**
 * REALTIME LOCAL SOCIAL (app-mini) — Marker cluster interfaces.
 *
 * Kết quả của `clusterMarkers(markers, zoom, gridSize)` (design.md §11.6).
 * Bất biến (Property 7 — design.md §13):
 *  - Σ cluster.count === markers.length (bảo toàn số lượng)
 *  - mỗi marker thuộc đúng 1 cluster (phân hoạch)
 * Phục vụ `RlsMarkerClusterComponent` (`@Input cluster`, design.md §9.3).
 */

import { RlsMapMarker } from './map-marker.interface';

/** Một cụm marker đã gom theo grid pixel ở mức zoom cho trước. */
export interface RlsMarkerCluster {
  /** Tâm cụm (trung bình lat/lng của thành viên). */
  lat: number;
  lng: number;
  /** Số marker trong cụm — Σ count == tổng marker đầu vào. */
  count: number;
  /** Các marker thành viên (phục vụ expand khi zoom in). */
  members: RlsMapMarker[];
}

/** Tham số gom cụm (khớp chữ ký `clusterMarkers`, design.md §11.6). */
export interface RlsClusterOptions {
  zoom: number;
  /** Kích thước ô lưới (pixel) — 2 marker cùng cụm có khoảng cách < gridSize. */
  gridSize: number;
}
