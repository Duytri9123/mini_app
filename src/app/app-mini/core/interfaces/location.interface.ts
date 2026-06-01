/**
 * REALTIME LOCAL SOCIAL (app-mini) — Location interfaces.
 *
 * Ánh xạ model `LOCATIONS` (design.md §5.1) + dữ liệu phục vụ map/nearby
 * (`GET /map/nearby`, `GET /map/markers`, `GET /locations/{id}`).
 * Prefix `Rls` để không xung đột với `bro-jet` (`Bj`) / dự án cũ.
 */

/** Phân loại địa điểm (design.md §5.1 LOCATIONS.category). */
export type RlsLocationCategory =
  | 'food'
  | 'cafe'
  | 'event'
  | 'nightlife'
  | 'campus'
  | 'other';

/** Thống kê tổng hợp của một địa điểm (tùy backend trả kèm). */
export interface RlsLocationStats {
  checkinsCount?: number;
  postsCount?: number;
  storiesCount?: number;
  activeCount?: number; // người đang hoạt động gần đây
  heatScore?: number; // score đã decay
}

/** Địa điểm (single source of truth ở backend, app chỉ render). */
export interface RlsLocation {
  id: number;
  name: string;
  category: RlsLocationCategory | string;
  lat: number;
  lng: number;
  geohash5?: string;
  geohash6?: string;
  communityId?: number | null;
  thumbnailUrl?: string | null;
  /** Khoảng cách (m) tới điểm truy vấn — chỉ có ở kết quả nearby. */
  distanceM?: number;
  stats?: RlsLocationStats;
  createdAt?: string; // ISO8601
  updatedAt?: string; // ISO8601
}

/** Phần tử trong danh sách nearby (`GET /map/nearby`). */
export interface RlsNearbyLocation extends RlsLocation {
  distanceM: number;
}
