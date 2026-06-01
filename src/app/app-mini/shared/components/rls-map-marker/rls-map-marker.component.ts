import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  RlsMapMarker,
  RlsMapMarkerVisualState,
  RlsMarkerType,
} from '../../../core/interfaces';
import { RLS_HOT_THRESHOLD } from '../../../core/constants/rls-config.constants';
import { RlsNeonBadgeComponent } from '../rls-neon-badge/rls-neon-badge.component';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — `RlsMapMarkerComponent`.
 * ─────────────────────────────────────────────────────────────────────────────
 * Presentational standalone DOM marker (design.md §6.2, §9.3): render 1 marker
 * ảnh (place photo / avatar / post thumbnail — R3.1) với **neon glow + pulse
 * theo type và activity count** (R3.2, R3.3). Dùng cho marker tuỳ biến DOM
 * (Leaflet `DivIcon` / MapLibre custom HTML marker); heatmap GPU layer tách
 * riêng ở `RlsHeatLayerComponent`.
 *
 * Quy ước style (R3.2 — mỗi type một màu neon riêng):
 *   food → hổ phách · cafe → lục lam · event → tím · hot_area → đỏ ·
 *   campus → lam · user → ngọc lục · post → hồng sen.
 *
 * Cường độ glow/pulse tỉ lệ với `activityCount` / `visualState` (R3.3): càng
 * nhiều hoạt động → glow càng mạnh, pulse càng nhanh; vượt `RLS_HOT_THRESHOLD`
 * (mirror server, design.md §4.3) → mức "hot".
 *
 * Badge countdown/count (R3.5) uỷ quyền cho `RlsNeonBadgeComponent`.
 *
 * Thuần `@Input marker` / `@Output tap` (design.md §9.3) — không gọi service,
 * không phụ thuộc map engine. Tailwind v4 dark-mode neon (R14.5).
 *
 * _Requirements: 3.1, 3.2, 3.3, 3.5, 14.5_
 * _Design: §6.2 Marker System; §9.3 RlsMapMarkerComponent_
 */
@Component({
  selector: 'rls-map-marker',
  standalone: true,
  imports: [CommonModule, RlsNeonBadgeComponent],
  templateUrl: './rls-map-marker.component.html',
})
export class RlsMapMarkerComponent {
  /** Marker đã chuẩn hoá để render (single source of truth — design.md §9.3). */
  @Input({ required: true }) marker!: RlsMapMarker;

  /** URL ảnh fallback khi `marker.thumbnailUrl` thiếu/lỗi (không hardcode host). */
  @Input() fallbackThumbnailUrl = '';

  /** Phát khi người dùng chạm vào marker → mở chi tiết/bottom sheet. */
  @Output() tap = new EventEmitter<RlsMapMarker>();

  /** Bảng màu neon theo type (R3.2) — viền + glow. Literal đầy đủ cho Tailwind. */
  private static readonly TYPE_RING: Record<RlsMarkerType, string> = {
    food: 'border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.65)]',
    cafe: 'border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.65)]',
    event: 'border-violet-400 shadow-[0_0_16px_rgba(167,139,250,0.65)]',
    hot_area: 'border-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.7)]',
    campus: 'border-blue-400 shadow-[0_0_16px_rgba(96,165,250,0.65)]',
    user: 'border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.65)]',
    post: 'border-fuchsia-400 shadow-[0_0_16px_rgba(232,121,249,0.65)]',
  };

  /** Biểu tượng fallback khi không có ảnh, theo type. */
  private static readonly TYPE_ICON: Record<RlsMarkerType, string> = {
    food: '🍜',
    cafe: '☕',
    event: '🎉',
    hot_area: '🔥',
    campus: '🎓',
    user: '🙂',
    post: '📸',
  };

  /** Mức hiển thị hiệu lực: ưu tiên `visualState`, nếu thiếu thì suy từ count. */
  get effectiveState(): RlsMapMarkerVisualState {
    if (this.marker.visualState) {
      return this.marker.visualState;
    }
    const count = this.safeActivityCount;
    if (count >= RLS_HOT_THRESHOLD) {
      return 'hot';
    }
    return count > 0 ? 'active' : 'default';
  }

  /** Activity count đã làm sạch (>= 0). */
  get safeActivityCount(): number {
    const c = this.marker.activityCount;
    if (typeof c !== 'number' || !Number.isFinite(c) || c < 0) {
      return 0;
    }
    return Math.floor(c);
  }

  /** Ảnh hiển thị (thumbnail của marker hoặc fallback). */
  get imageUrl(): string {
    return this.marker.thumbnailUrl || this.fallbackThumbnailUrl;
  }

  /** Biểu tượng fallback theo type khi không có ảnh. */
  get typeIcon(): string {
    return RlsMapMarkerComponent.TYPE_ICON[this.marker.type] ?? '📍';
  }

  /** Class viền + glow neon theo type (R3.2). */
  get ringClass(): string {
    return (
      RlsMapMarkerComponent.TYPE_RING[this.marker.type] ??
      'border-slate-400 shadow-[0_0_12px_rgba(148,163,184,0.5)]'
    );
  }

  /**
   * Class pulse theo cường độ hoạt động / state (R3.3). 'hot' pulse nhanh, các
   * mức hoạt động khác pulse chậm hơn; 'default' không pulse.
   */
  get pulseClass(): string {
    switch (this.effectiveState) {
      case 'hot':
        return 'animate-ping';
      case 'active':
      case 'selected':
        return 'animate-pulse';
      default:
        return '';
    }
  }

  /** Class wrapper tổng (scale nhẹ khi selected/hot để nổi bật). */
  get wrapperScaleClass(): string {
    return this.effectiveState === 'selected' || this.effectiveState === 'hot'
      ? 'scale-110'
      : 'scale-100';
  }

  /** `true` khi cần vẽ vòng pulse phụ trợ phía sau marker. */
  get showPulseRing(): boolean {
    return this.effectiveState !== 'default';
  }

  /** Nhãn trợ năng cho marker. */
  get ariaLabel(): string {
    const label = this.marker.label || this.marker.type;
    const count = this.safeActivityCount;
    return count > 0 ? `${label}, ${count} hoạt động` : `${label}`;
  }

  onTap(): void {
    this.tap.emit(this.marker);
  }

  /** Ẩn ảnh lỗi để lộ icon fallback (không phá layout). */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) {
      img.style.display = 'none';
    }
  }
}
