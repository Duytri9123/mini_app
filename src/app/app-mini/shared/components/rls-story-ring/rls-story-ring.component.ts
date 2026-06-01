import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RlsStory } from '../../../core/interfaces';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Story ring (presentational, standalone).
 * ─────────────────────────────────────────────────────────────────────────────
 * Vòng tròn story dạng avatar có **gradient ring** + **seen state** (design.md
 * §9.3 `RlsStoryRingComponent`, §6.7; R8.6). Component **thuần trình bày**:
 * nhận `@Input story: RlsStory`, phát `@Output open` khi user chạm để mở viewer
 * — KHÔNG tải/lọc story (việc lọc hết hạn do `RlsStoryService` +
 * `story-expiry.util` đảm nhiệm).
 *
 * - Chưa xem (`seen=false`): ring gradient neon rực + glow.
 * - Đã xem (`seen=true`): ring xám mờ (đúng "seen state").
 *
 * Style dark neon glow + light glassmorphism qua Tailwind v4 (R14.5).
 *
 * _Requirements: 8.6, 14.5_
 * _Design: 9.3 Component breakdown — RlsStoryRingComponent; 6.7 Stories_
 */
@Component({
  selector: 'rls-story-ring',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rls-story-ring.component.html',
})
export class RlsStoryRingComponent {
  /** Story cần render vòng (single source of truth từ story service). */
  @Input({ required: true }) story!: RlsStory;

  /** Nhãn hiển thị dưới vòng (mặc định bật). */
  @Input() showLabel = true;

  /** Phát story khi user chạm để mở story viewer (R8.6). */
  @Output() open = new EventEmitter<RlsStory>();

  /** Đã xem hay chưa → quyết định màu ring (seen state). */
  get isSeen(): boolean {
    return this.story?.seen === true;
  }

  /** Tên tác giả hiển thị (fallback khi thiếu). */
  get authorName(): string {
    return this.story?.authorName?.trim() || 'Story';
  }

  /** Chữ cái đầu cho avatar placeholder. */
  get authorInitial(): string {
    return this.authorName.charAt(0).toUpperCase();
  }

  /** Ảnh hiển thị trong vòng: ưu tiên avatar, fallback media của story. */
  get avatarUrl(): string | null {
    return this.story?.authorAvatar || this.story?.mediaUrl || null;
  }

  /** Chạm vòng → phát open. */
  onOpen(): void {
    this.open.emit(this.story);
  }
}
