import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RlsMarkerBadge } from '../../../core/interfaces';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — `RlsNeonBadgeComponent`.
 * ─────────────────────────────────────────────────────────────────────────────
 * Presentational standalone component (design.md §9.3): badge neon nhỏ gắn lên
 * marker hoặc card. Hỗ trợ hai dạng (`RlsMarkerBadge.kind`):
 *   - `countdown` — đếm ngược tới giờ sự kiện (R3.5). Giá trị đã được format sẵn
 *     ở nguồn (`NewMarkerEvent.badge.value`, design.md §7.1) nên component chỉ
 *     render + tô màu neon; không tự tick.
 *   - `count`     — đếm số lượng hoạt động (vd "+12") (R3.3).
 *
 * Style: Tailwind v4 dark-mode neon glow + light glassmorphism (R14.5). Class
 * được trả qua getter dạng literal đầy đủ để Tailwind quét được (mirror cách
 * `bj-station-card` tính `badgeClass`).
 *
 * Không phụ thuộc service/map — thuần `@Input`, an toàn tái sử dụng ở mọi nơi
 * (marker, cluster, feed card…). Ẩn hoàn toàn khi không có `badge`.
 *
 * _Requirements: 3.5, 3.3, 14.5_
 * _Design: §9.3 component breakdown — RlsNeonBadgeComponent; §7.1 badge payload_
 */
@Component({
  selector: 'rls-neon-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rls-neon-badge.component.html',
})
export class RlsNeonBadgeComponent {
  /** Badge cần hiển thị; `null/undefined` → component không render gì. */
  @Input() badge?: RlsMarkerBadge | null;

  /** Biểu tượng theo loại badge (đồng hồ cho countdown, đốm lửa cho count). */
  get icon(): string {
    if (!this.badge) {
      return '';
    }
    return this.badge.kind === 'countdown' ? '⏱' : '🔥';
  }

  /**
   * Class neon theo loại badge — literal đầy đủ để Tailwind v4 quét tĩnh.
   * countdown → hổ phách (sắp diễn ra); count → hồng sen (mức độ sôi động).
   */
  get badgeClass(): string {
    const base =
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none backdrop-blur-md';
    if (!this.badge) {
      return base;
    }
    return this.badge.kind === 'countdown'
      ? `${base} border-amber-400/60 bg-amber-500/15 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.55)]`
      : `${base} border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_12px_rgba(232,121,249,0.55)]`;
  }

  /** Nhãn trợ năng (accessibility) cho badge. */
  get ariaLabel(): string {
    if (!this.badge) {
      return '';
    }
    const prefix = this.badge.kind === 'countdown' ? 'Đếm ngược' : 'Hoạt động';
    return `${prefix}: ${this.badge.value}`;
  }
}
