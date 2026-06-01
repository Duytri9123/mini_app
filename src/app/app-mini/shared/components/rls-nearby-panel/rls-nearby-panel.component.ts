import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { RlsLocation, RlsNearbyLocation } from '../../../core/interfaces';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Panel "gần bạn" trong bottom sheet.
 * ─────────────────────────────────────────────────────────────────────────────
 * Presentational standalone component (design.md §9.3 `RlsNearbyPanelComponent`)
 * hiển thị danh sách địa điểm gần người dùng (kết quả `GET /map/nearby`) bên
 * trong `RlsBottomSheetComponent` trên `HomeMapPage` (R2.4). Component **thuần
 * UI**: nhận danh sách đã tính sẵn qua `@Input places` (design.md §9.3) và phát
 * sự kiện chọn để page xử lý (mở chi tiết / recenter map) — không gọi service,
 * không hardcode URL (R14.3).
 *
 * Khoảng cách (`distanceM`) do backend tính (mirror GeospatialQueryService) và
 * đã sắp xếp tăng dần; panel chỉ format hiển thị, không tự sắp xếp lại.
 *
 * Style: dark neon glow + light glassmorphism (Tailwind v4, R14.5).
 *
 * _Requirements: 2.4, 14.5 — Design §6.1, §6.5, §9.3_
 */
@Component({
  selector: 'rls-nearby-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rls-nearby-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsNearbyPanelComponent {
  /** Danh sách địa điểm gần (đã sắp xếp tăng dần theo khoảng cách ở backend). */
  @Input() places: RlsNearbyLocation[] = [];

  /** Đang nạp dữ liệu → hiện skeleton thay vì empty state. */
  @Input() loading = false;

  /** Phát khi người dùng chọn một địa điểm (mở chi tiết). */
  @Output() select = new EventEmitter<RlsLocation>();

  /** trackBy theo id để Angular không re-render toàn bộ danh sách. */
  trackById(_index: number, place: RlsLocation): number {
    return place.id;
  }

  /** Phát sự kiện chọn địa điểm. */
  onSelect(place: RlsLocation): void {
    this.select.emit(place);
  }

  /**
   * Format khoảng cách dễ đọc: `< 1km` hiển thị mét, còn lại hiển thị km (1 lẻ).
   * Trả `''` khi không có khoảng cách để template ẩn badge.
   */
  formatDistance(meters?: number): string {
    if (meters == null || !Number.isFinite(meters) || meters < 0) {
      return '';
    }
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }
}
