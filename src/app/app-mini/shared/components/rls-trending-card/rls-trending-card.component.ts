import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RlsTrendingPlace, RlsTrendingReason } from '../../../core/interfaces';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Trending card (presentational, standalone).
 * ─────────────────────────────────────────────────────────────────────────────
 * Card một địa điểm trending kèm **lý do** (crowded / viral / event / rising)
 * (design.md §9.3 `RlsTrendingCardComponent`, §6.5; R6.4). Component **thuần
 * trình bày**: nhận `@Input place: RlsTrendingPlace` (đã do `RankingService`
 * backend annotate reason — single source of truth) và phát `@Output open` khi
 * user chạm — KHÔNG tự xếp hạng / suy luận lý do.
 *
 * Hiển thị khoảng cách nếu có `distanceM` (R6.3). Style dark neon glow + light
 * glassmorphism qua Tailwind v4 (R14.5).
 *
 * _Requirements: 6.4, 14.5_
 * _Design: 9.3 Component breakdown — RlsTrendingCardComponent; 6.5 Nearby Trending_
 */
@Component({
  selector: 'rls-trending-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rls-trending-card.component.html',
})
export class RlsTrendingCardComponent {
  /** Địa điểm trending cần render (gồm reason đã annotate, R6.4). */
  @Input({ required: true }) place!: RlsTrendingPlace;

  /** Phát place khi user chạm card để mở chi tiết (R6.4). */
  @Output() open = new EventEmitter<RlsTrendingPlace>();

  /** Badge hiển thị theo lý do trending (icon + nhãn + màu neon — R6.4). */
  private readonly reasonMeta: Record<
    RlsTrendingReason,
    { icon: string; label: string; badge: string }
  > = {
    crowded: {
      icon: '👥',
      label: 'Đông người',
      badge: 'bg-rose-500/15 text-rose-300 ring-rose-400/40',
    },
    viral: {
      icon: '🚀',
      label: 'Viral',
      badge: 'bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/40',
    },
    event: {
      icon: '🎉',
      label: 'Sự kiện',
      badge: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/40',
    },
    rising: {
      icon: '📈',
      label: 'Đang lên',
      badge: 'bg-amber-500/15 text-amber-300 ring-amber-400/40',
    },
  };

  /** Metadata của lý do hiện tại (fallback `rising` nếu reason lạ). */
  get reason(): { icon: string; label: string; badge: string } {
    return this.reasonMeta[this.place?.reason as RlsTrendingReason] ?? this.reasonMeta.rising;
  }

  /** Nhãn lý do hiển thị: ưu tiên `reasonLabel` từ backend, fallback nhãn mặc định. */
  get reasonText(): string {
    return this.place?.reasonLabel?.trim() || this.reason.label;
  }

  /** Chữ cái đầu cho thumbnail placeholder. */
  get nameInitial(): string {
    return (this.place?.name?.trim() || '?').charAt(0).toUpperCase();
  }

  /** Có khoảng cách để hiển thị không (R6.3). */
  get hasDistance(): boolean {
    return typeof this.place?.distanceM === 'number' && this.place.distanceM >= 0;
  }

  /** Khoảng cách định dạng người đọc (m / km). */
  get distanceText(): string {
    const m = this.place?.distanceM;
    if (typeof m !== 'number' || m < 0) {
      return '';
    }
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
  }

  /** Chạm card → phát open. */
  onOpen(): void {
    this.open.emit(this.place);
  }
}
