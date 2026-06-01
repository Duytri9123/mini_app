import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RLS_HOT_THRESHOLD } from '../../../core/constants/rls-config.constants';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — `RlsActivityCounterComponent`.
 * ─────────────────────────────────────────────────────────────────────────────
 * Presentational standalone component (design.md §9.3): live counter
 * "X đang hoạt động" cho một khu vực. Nhận `count` (số hoạt động trong cửa sổ
 * gần đây) và `heatScore` (score đã decay) từ sự kiện realtime
 * `ActivityCounterUpdated` (design.md §7.1) hoặc heat point.
 *
 * Hành vi chốt theo acceptance criteria:
 *   - `count` KHÔNG bao giờ hiển thị âm (R4.6) — giá trị âm/không hữu hạn kẹp 0.
 *   - Cường độ pulse/glow tăng theo mức hoạt động (R3.3): càng "hot" glow càng
 *     mạnh; vượt `RLS_HOT_THRESHOLD` (mirror server, design.md §4.3) → mức cao
 *     nhất (đỏ, pulse nhanh).
 *
 * Style Tailwind v4 dark-mode neon (R14.5). Component thuần `@Input`, không gọi
 * service — an toàn nhúng vào marker, bottom sheet, panel.
 *
 * _Requirements: 3.3, 4.6, 14.5_
 * _Design: §9.3 RlsActivityCounterComponent; §7.1 ActivityCounterUpdated_
 */
@Component({
  selector: 'rls-activity-counter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rls-activity-counter.component.html',
})
export class RlsActivityCounterComponent {
  /** Số hoạt động gần đây — clamp về 0 nếu âm/không hợp lệ (R4.6). */
  @Input() count = 0;

  /** Score heat đã decay (tuỳ chọn) — dùng phụ trợ chọn mức "hot" khi có. */
  @Input() heatScore?: number;

  /** Nhãn rút gọn cạnh số (mặc định tiếng Việt). */
  @Input() label = 'đang hoạt động';

  /** Số hiển thị đã được làm sạch — luôn `>= 0` và là số nguyên hữu hạn (R4.6). */
  get safeCount(): number {
    if (!Number.isFinite(this.count) || this.count < 0) {
      return 0;
    }
    return Math.floor(this.count);
  }

  /**
   * Mức cường độ glow theo hoạt động (R3.3): `idle` (0) → `low` → `medium` →
   * `hot`. Ưu tiên ngưỡng `count`; nếu có `heatScore` vượt `HOT_THRESHOLD` thì
   * nâng thẳng lên `hot` để nhất quán với phân loại màu của server (design.md §4.3).
   */
  get intensity(): 'idle' | 'low' | 'medium' | 'hot' {
    const c = this.safeCount;
    const score = Number.isFinite(this.heatScore) ? (this.heatScore as number) : 0;
    if (c === 0 && score <= 0) {
      return 'idle';
    }
    if (c >= RLS_HOT_THRESHOLD || score >= RLS_HOT_THRESHOLD) {
      return 'hot';
    }
    if (c >= Math.ceil(RLS_HOT_THRESHOLD / 2)) {
      return 'medium';
    }
    return 'low';
  }

  /** `true` khi nên chạy animation pulse (mọi mức có hoạt động). */
  get isPulsing(): boolean {
    return this.intensity !== 'idle';
  }

  /** Class container neon đầy đủ (literal) theo `intensity` để Tailwind quét tĩnh. */
  get containerClass(): string {
    const base =
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none backdrop-blur-md transition-colors';
    switch (this.intensity) {
      case 'hot':
        return `${base} border-rose-400/60 bg-rose-500/15 text-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.6)]`;
      case 'medium':
        return `${base} border-orange-400/60 bg-orange-500/15 text-orange-200 shadow-[0_0_14px_rgba(251,146,60,0.55)]`;
      case 'low':
        return `${base} border-cyan-400/60 bg-cyan-500/15 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.5)]`;
      default:
        return `${base} border-slate-600/50 bg-slate-800/40 text-slate-300`;
    }
  }

  /** Class chấm trạng thái (pulse) theo `intensity`. */
  get dotClass(): string {
    const base = 'h-1.5 w-1.5 rounded-full';
    const pulse = this.isPulsing ? ' animate-ping' : '';
    switch (this.intensity) {
      case 'hot':
        return `${base} bg-rose-400${pulse}`;
      case 'medium':
        return `${base} bg-orange-400${pulse}`;
      case 'low':
        return `${base} bg-cyan-400${pulse}`;
      default:
        return `${base} bg-slate-500`;
    }
  }
}
