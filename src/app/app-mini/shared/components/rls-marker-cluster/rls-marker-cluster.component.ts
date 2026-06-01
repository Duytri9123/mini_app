import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RlsMarkerCluster } from '../../../core/interfaces';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — `RlsMarkerClusterComponent`.
 * ─────────────────────────────────────────────────────────────────────────────
 * Presentational standalone component (design.md §9.3): render MỘT cụm marker
 * (kết quả `clusterMarkers`, design.md §11.6) ở mức zoom thấp với hiệu ứng
 * "campus cluster" — vòng glow + số đếm. Khi nhiều marker rơi vào một vùng nhỏ,
 * map hiển thị cluster thay vì từng marker; clustering bảo toàn tổng số
 * (`Σ count == markers.length` — Property 7 / R3.4), số trong bong bóng = `count`.
 *
 * Component KHÔNG tự gom cụm (logic thuần nằm ở `cluster.util`) — chỉ render
 * `@Input cluster` và phát `@Output tap`/`expand` để page zoom-in/expand.
 *
 * Kích thước + cường độ glow tăng theo `count` (vùng càng đông → bong bóng càng
 * lớn, pulse càng rõ) để đọc mật độ bằng mắt. Tailwind v4 dark-mode neon (R14.5).
 *
 * _Requirements: 3.4, 14.5_
 * _Design: §9.3 RlsMarkerClusterComponent; §11.6 marker clustering; §13 Property 7_
 */
@Component({
  selector: 'rls-marker-cluster',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rls-marker-cluster.component.html',
})
export class RlsMarkerClusterComponent {
  /** Cụm marker cần render (tâm + count + members — design.md §11.6). */
  @Input({ required: true }) cluster!: RlsMarkerCluster;

  /** Phát khi chạm vào cụm → page zoom-in / expand các marker thành viên. */
  @Output() tap = new EventEmitter<RlsMarkerCluster>();

  /** Số marker trong cụm, đã làm sạch (>= 0). */
  get count(): number {
    const c = this.cluster?.count;
    if (typeof c !== 'number' || !Number.isFinite(c) || c < 0) {
      return 0;
    }
    return Math.floor(c);
  }

  /** Nhãn hiển thị: rút gọn số lớn (vd 1.2k) để vừa bong bóng. */
  get displayCount(): string {
    const n = this.count;
    if (n >= 1000) {
      return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`;
    }
    return `${n}`;
  }

  /** Bậc kích thước theo mật độ — bong bóng to dần khi cụm đông hơn. */
  get sizeTier(): 'sm' | 'md' | 'lg' | 'xl' {
    const n = this.count;
    if (n >= 100) {
      return 'xl';
    }
    if (n >= 25) {
      return 'lg';
    }
    if (n >= 10) {
      return 'md';
    }
    return 'sm';
  }

  /** Class kích thước bong bóng theo `sizeTier` (literal cho Tailwind). */
  get sizeClass(): string {
    switch (this.sizeTier) {
      case 'xl':
        return 'h-16 w-16 text-base';
      case 'lg':
        return 'h-14 w-14 text-sm';
      case 'md':
        return 'h-12 w-12 text-sm';
      default:
        return 'h-10 w-10 text-xs';
    }
  }

  /** Class màu + glow theo mật độ (đông hơn → ấm/đỏ hơn). */
  get glowClass(): string {
    switch (this.sizeTier) {
      case 'xl':
        return 'border-rose-400/70 bg-rose-500/20 text-rose-100 shadow-[0_0_22px_rgba(244,63,94,0.65)]';
      case 'lg':
        return 'border-orange-400/70 bg-orange-500/20 text-orange-100 shadow-[0_0_20px_rgba(251,146,60,0.6)]';
      case 'md':
        return 'border-amber-400/70 bg-amber-500/20 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.55)]';
      default:
        return 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.5)]';
    }
  }

  /** Nhãn trợ năng. */
  get ariaLabel(): string {
    return `Cụm ${this.count} địa điểm`;
  }

  onTap(): void {
    this.tap.emit(this.cluster);
  }
}
