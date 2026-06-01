import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RlsPost, RlsPostType, RlsReactionType } from '../../../core/interfaces';
import { RlsReactionBarComponent } from '../rls-reaction-bar/rls-reaction-bar.component';

/** Payload phát ra khi user react trên một post (gồm cả post để service xử lý). */
export interface RlsFeedReactEvent {
  post: RlsPost;
  type: RlsReactionType;
}

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Feed card (presentational, standalone).
 * ─────────────────────────────────────────────────────────────────────────────
 * Render **một item local feed**: check-in / review / video / meme / text
 * (design.md §9.3 `RlsFeedCardComponent`, §6.4; R5.2). Component **thuần trình
 * bày** — nhận `@Input post: RlsPost`, phát `@Output react` (kèm loại reaction)
 * và `@Output comment` khi user tương tác; KHÔNG gọi API và KHÔNG giữ state
 * nghiệp vụ (đếm reaction/comment đến từ `post`, do service/backend cập nhật
 * — R5.5).
 *
 * Reaction bar được nhúng từ `RlsReactionBarComponent` (R5.5) để tách nhỏ &
 * tái sử dụng. Style dark neon glow + light glassmorphism qua Tailwind v4
 * (R14.5).
 *
 * _Requirements: 5.2, 5.5, 14.5_
 * _Design: 9.3 Component breakdown — RlsFeedCardComponent; 6.4 Local Feed_
 */
@Component({
  selector: 'rls-feed-card',
  standalone: true,
  imports: [CommonModule, RlsReactionBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rls-feed-card.component.html',
})
export class RlsFeedCardComponent {
  /** Bài đăng cần render (single source of truth từ feed service). */
  @Input({ required: true }) post!: RlsPost;

  /** Phát khi user chọn một reaction (R5.5). */
  @Output() react = new EventEmitter<RlsFeedReactEvent>();

  /** Phát khi user chạm vào nút comment (R5.5). */
  @Output() comment = new EventEmitter<RlsPost>();

  /** Nhãn + icon hiển thị theo loại post (design.md §6.4 content types — R5.2). */
  private readonly typeMeta: Record<RlsPostType, { label: string; icon: string; accent: string }> = {
    checkin: { label: 'Check-in', icon: '📍', accent: 'text-cyan-300' },
    review: { label: 'Review', icon: '⭐', accent: 'text-amber-300' },
    video: { label: 'Video', icon: '🎬', accent: 'text-fuchsia-300' },
    meme: { label: 'Meme', icon: '😂', accent: 'text-lime-300' },
    text: { label: 'Bài viết', icon: '📝', accent: 'text-slate-300' },
  };

  /** Metadata loại post hiện tại (fallback an toàn nếu type lạ từ backend). */
  get meta(): { label: string; icon: string; accent: string } {
    return this.typeMeta[this.post?.type as RlsPostType] ?? this.typeMeta.text;
  }

  /** Tên tác giả hiển thị (fallback khi thiếu profile). */
  get authorName(): string {
    return this.post?.author?.displayName?.trim() || 'Người dùng';
  }

  /** Chữ cái đầu cho avatar placeholder. */
  get authorInitial(): string {
    return this.authorName.charAt(0).toUpperCase();
  }

  /** Ảnh/thumbnail đầu tiên của post (nếu có). */
  get coverUrl(): string | null {
    return this.post?.media?.length ? this.post.media[0] : null;
  }

  /** Có media để render khối ảnh/video hay không. */
  get hasMedia(): boolean {
    return !!this.coverUrl;
  }

  /** Phát reaction kèm post để consumer biết target. */
  onReact(type: RlsReactionType): void {
    this.react.emit({ post: this.post, type });
  }

  /** Phát yêu cầu mở/comment. */
  onComment(): void {
    this.comment.emit(this.post);
  }
}
