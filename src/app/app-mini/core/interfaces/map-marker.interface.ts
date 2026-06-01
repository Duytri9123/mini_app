/**
 * REALTIME LOCAL SOCIAL (app-mini) — Map render marker interfaces.
 *
 * `MapMarker` là dạng marker đã chuẩn hóa để render trên bản đồ
 * (`RlsMapMarkerComponent`, design.md §9.3) và là input cho thuật toán
 * clustering thuần (`clusterMarkers`, design.md §11.6 / Property 7).
 *
 * Tách khỏi `RlsMarker` (nghiệp vụ, từ API) để lớp render không phụ thuộc
 * trực tiếp payload backend.
 */

import { RlsMarkerType, RlsMarkerBadge } from './marker.interface';

/** Trạng thái hiển thị của marker trên bản đồ (glow/pulse/selected). */
export type RlsMapMarkerVisualState =
  | 'default'
  | 'active'
  | 'hot'
  | 'selected';

/**
 * Marker render trên bản đồ — đơn vị đầu vào của `clusterMarkers`.
 * Bất biến clustering (Property 7): mỗi marker thuộc đúng 1 cluster,
 * tổng count cluster == số marker.
 */
export interface RlsMapMarker {
  id: string;
  lat: number;
  lng: number;
  type: RlsMarkerType;
  thumbnailUrl?: string;
  label?: string;
  badge?: RlsMarkerBadge;
  /** Cường độ hoạt động → pulse/glow intensity (design.md R3.3). */
  activityCount?: number;
  visualState?: RlsMapMarkerVisualState;
}
