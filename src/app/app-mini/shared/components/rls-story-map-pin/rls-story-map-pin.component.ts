import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RlsStory } from '../../../core/interfaces';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Story map pin (presentational, standalone).
 * ─────────────────────────────────────────────────────────────────────────────
 * Pin của một story trên bản đồ (design.md §9.3 `RlsStoryMapPinComponent`,
 * §6.7; R8.6 — "story map"). Component **thuần trình bày**: nhận
 * `@Input story: RlsStory` và vẽ pin tròn (thumbnail story + ring neon + đuôi
 * pin). Dùng làm nội dung của một Leaflet `DivIcon`/marker hoặc overlay trên
 * map host — KHÔNG tự đặt vị trí địa lý (việc đó do layer/map service).
 *
 * Phát `@Output tap` (tiện dụng) để map host có thể mở viewer khi chạm pin;
 * không thuộc hợp đồng tối thiểu của design (`@Input story`) nên optional.
 *
 * Style dark neon glow qua Tailwind v4 (R14.5).
 *
 * _Requirements: 8.6, 14.5_
 * _Design: 9.3 Component breakdown — RlsStoryMapPinComponent; 6.7 Stories_
 */
@Component({
  selector: 'rls-story-map-pin',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rls-story-map-pin.component.html',
})
export class RlsStoryMapPinComponent {
  /** Story cần render pin (single source of truth từ story service). */
  @Input({ required: true }) story!: RlsStory;

  /** Phát story khi user chạm pin (tiện ích cho map host mở viewer). */
  @Output() tap = new EventEmitter<RlsStory>();

  /** Đã xem hay chưa → ring xám/neon. */
  get isSeen(): boolean {
    return this.story?.seen === true;
  }

  /** Tên tác giả (fallback). */
  get authorName(): string {
    return this.story?.authorName?.trim() || 'Story';
  }

  /** Chữ cái đầu cho placeholder. */
  get authorInitial(): string {
    return this.authorName.charAt(0).toUpperCase();
  }

  /** Ảnh trong pin: ưu tiên media story, fallback avatar. */
  get thumbUrl(): string | null {
    return this.story?.mediaUrl || this.story?.authorAvatar || null;
  }

  /** Chạm pin → phát ra ngoài. */
  onTap(): void {
    this.tap.emit(this.story);
  }
}
