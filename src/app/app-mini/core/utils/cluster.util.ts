/**
 * cluster.util.ts — Hàm thuần gom (cluster) marker ở mức zoom thấp.
 *
 * Thiết kế: design.md §11.6 "Marker clustering (client)" và §13 Property 7.
 * Requirements: 3.4 (clustering bảo toàn tổng số marker — không mất/không nhân đôi),
 *               15.1 (thuật toán lõi là hàm thuần trong core/utils).
 *
 * Hàm `clusterMarkers` là PURE: cùng input → cùng output, không side-effect,
 * không phụ thuộc trạng thái ngoài (không Date.now(), không random, không I/O).
 *
 * Bất biến (Property 7):
 *   - Σ cluster.count === markers.length          (bảo toàn số lượng)
 *   - mỗi marker thuộc đúng 1 cluster              (phân hoạch — partition)
 *   - hai marker cùng cluster có khoảng cách pixel < gridSize (cùng ô lưới)
 *
 * Kiểu dữ liệu lấy từ `core/interfaces` (single source of truth, task 10.2):
 *   - đầu vào mặc định là {@link RlsMapMarker}
 *   - kết quả tương thích cấu trúc với {@link RlsMarkerCluster}
 * Hàm được giữ generic trên ràng buộc tối thiểu {@link ClusterableMarker}
 * (chỉ cần `lat`/`lng`) để property-based test (task 13.4) có thể sinh marker
 * rút gọn mà vẫn bảo toàn kiểu của thành viên cụm.
 */

import { RlsMapMarker } from '../interfaces/map-marker.interface';
import { RlsMarkerCluster } from '../interfaces/cluster.interface';

/**
 * Ràng buộc tối thiểu để gom cụm: chỉ cần toạ độ địa lý.
 * Cho phép truyền `RlsMapMarker` đầy đủ hoặc marker rút gọn (PBT) — mọi trường
 * bổ sung đều được giữ nguyên trong `members` nên không mất dữ liệu.
 */
export type ClusterableMarker = Pick<RlsMapMarker, 'lat' | 'lng'>;

/**
 * Một cụm marker sau khi gom theo lưới pixel.
 *
 * Khi `T = RlsMapMarker`, `MarkerCluster<T>` tương thích cấu trúc với
 * {@link RlsMarkerCluster} (cùng `lat`/`lng`/`count`/`members`).
 */
export interface MarkerCluster<T extends ClusterableMarker = RlsMapMarker> {
  /** Vĩ độ tâm cụm (trung bình cộng vĩ độ các thành viên). */
  lat: number;
  /** Kinh độ tâm cụm (trung bình cộng kinh độ các thành viên). */
  lng: number;
  /** Số marker trong cụm (= members.length). */
  count: number;
  /** Các marker thành viên của cụm. */
  members: T[];
}

/** Kích thước tile Web Mercator chuẩn (px). */
const TILE_SIZE = 256;

/** Giới hạn vĩ độ Web Mercator (tránh py → ±∞ tại hai cực). */
const MAX_MERCATOR_LAT = 85.05112878;

/**
 * Chiếu (lat, lng) sang toạ độ pixel toàn cục theo Web Mercator tại `zoom`.
 * Đây là phép chiếu chuẩn của bản đồ dạng tile (Leaflet/MapLibre).
 */
function project(lat: number, lng: number, zoom: number): { px: number; py: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const clampedLat = clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);

  const px = ((lng + 180) / 360) * scale;
  const py = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;

  return { px, py };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Gom marker gần nhau ở mức zoom thấp thành cluster theo lưới pixel.
 *
 * Pre:  markers hữu hạn.
 * Post: phân hoạch markers thành các cụm; tổng count == markers.length;
 *       hai marker cùng cụm nằm trong cùng ô lưới `gridSize` px.
 *
 * Robustness (để giữ bất biến với mọi input của property-based testing):
 *   - `zoom` không phải số hữu hạn hoặc < 0 → kẹp về 0.
 *   - `gridSize` không phải số hữu hạn dương → dùng 1 (vẫn phân hoạch hợp lệ).
 * Dù với input biên, phép gán mỗi marker vào đúng một khoá ô lưới là toàn phần
 * và xác định, nên bảo toàn số lượng và tính phân hoạch luôn đúng.
 *
 * @param markers  Danh sách marker cần gom (mặc định {@link RlsMapMarker}).
 * @param zoom     Mức zoom hiện tại của bản đồ (>= 0).
 * @param gridSize Kích thước ô lưới tính bằng pixel (> 0).
 * @returns Mảng cụm theo thứ tự xuất hiện lần đầu của ô lưới (deterministic).
 */
export function clusterMarkers<T extends ClusterableMarker>(
  markers: readonly T[],
  zoom: number,
  gridSize: number,
): MarkerCluster<T>[] {
  if (!markers || markers.length === 0) {
    return [];
  }

  const safeZoom = Number.isFinite(zoom) && zoom >= 0 ? zoom : 0;
  const safeGrid = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 1;

  // Giữ thứ tự ô xuất hiện lần đầu để output xác định (deterministic).
  const order: string[] = [];
  const grid = new Map<string, T[]>();

  for (const m of markers) {
    const { px, py } = project(m.lat, m.lng, safeZoom);
    const cellX = Math.floor(px / safeGrid);
    const cellY = Math.floor(py / safeGrid);
    const key = `${cellX}:${cellY}`;

    let cell = grid.get(key);
    if (cell === undefined) {
      cell = [];
      grid.set(key, cell);
      order.push(key);
    }
    cell.push(m);
  }

  const clusters: MarkerCluster<T>[] = [];
  for (const key of order) {
    const cell = grid.get(key)!;
    let sumLat = 0;
    let sumLng = 0;
    for (const m of cell) {
      sumLat += m.lat;
      sumLng += m.lng;
    }
    const count = cell.length;
    clusters.push({
      lat: sumLat / count,
      lng: sumLng / count,
      count,
      members: cell,
    });
  }

  return clusters;
}

/**
 * Kiểm tra tĩnh: `MarkerCluster<RlsMapMarker>` phải tương thích cấu trúc với
 * `RlsMarkerCluster` (interface dùng cho `RlsMarkerClusterComponent`, §9.3).
 * Dòng này chỉ tồn tại ở compile-time (type-only), không phát sinh JS.
 */
export type _AssertClusterShape = MarkerCluster<RlsMapMarker> extends RlsMarkerCluster
  ? true
  : never;
