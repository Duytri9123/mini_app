import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RlsReactionType } from '../../../core/interfaces';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Reaction bar (presentational, standalone).
 * ─────────────────────────────────────────────────────────────────────────────
 * Thanh reaction `like | love | fire | wow` (design.md §9.3
 * `RlsReactionBarComponent`, R5.5). Component **thuần trình bày**: chỉ phát
 * `@Output react` khi người dùng chạm một reaction — KHÔNG gọi API, KHÔNG giữ
 * business state. Việc "một reaction / user / target" (R5.5) do service/backend
 * enforce; ở đây chỉ phản ánh `active` để tô sáng lựa chọn hiện tại.
 *
 * Style: dark neon glow + light glassmorphism qua Tailwind v4 utilities (R14.5).
 *
 * _Requirements: 5.5, 14.5_
 * _Design: 9.3 Component breakdown — RlsReactionBarComponent_
 */
@Component({
  selector: 'rls-reaction-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rls-reaction-bar.component.html',
})
export class RlsReactionBarComponent {
  /** Reaction hiện tại của user (tô sáng nút tương ứng); null = chưa react. */
  @Input() active: RlsReactionType | null = null;

  /** Hiện nhãn chữ cạnh emoji (mặc định chỉ emoji cho gọn). */
  @Input() showLabels = false;

  /** Vô hiệu hoá tương tác (vd đang gửi request). */
  @Input() disabled = false;

  /** Phát loại reaction khi người dùng chạm (R5.5). */
  @Output() react = new EventEmitter<RlsReactionType>();

  /** Thứ tự + metadata hiển thị của 4 reaction (design.md §5.1 REACTIONS.type). */
  readonly reactions: ReadonlyArray<{
    type: RlsReactionType;
    emoji: string;
    label: string;
    /** Glow theo từng loại để hợp dark-neon (R14.5). */
    glow: string;
  }> = [
    { type: 'like', emoji: '👍', label: 'Thích', glow: 'shadow-[0_0_12px_rgba(34,211,238,0.55)]' },
    { type: 'love', emoji: '❤️', label: 'Yêu', glow: 'shadow-[0_0_12px_rgba(244,114,182,0.55)]' },
    { type: 'fire', emoji: '🔥', label: 'Cháy', glow: 'shadow-[0_0_12px_rgba(251,146,60,0.6)]' },
    { type: 'wow', emoji: '😮', label: 'Wow', glow: 'shadow-[0_0_12px_rgba(250,204,21,0.55)]' },
  ];

  /** Chạm một reaction → phát ra ngoài (no-op khi disabled). */
  onReact(type: RlsReactionType): void {
    if (this.disabled) {
      return;
    }
    this.react.emit(type);
  }

  /** trackBy để không re-render thừa danh sách reaction tĩnh. */
  trackByType(_index: number, item: { type: RlsReactionType }): RlsReactionType {
    return item.type;
  }
}
