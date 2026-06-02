import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { RlsLocation } from '../../../core/interfaces';

interface RlsInlineUser {
  name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
}

@Component({
  selector: 'rls-place-inline-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rls-place-inline-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsPlaceInlineDetailComponent {
  @Input({ required: true }) place!: RlsLocation;
  @Input() loading = false;
  @Input() detail: any = null;

  @Output() close = new EventEmitter<void>();

  readonly fallbackImageUrl = 'assets/images/No_Image_Available.jpg';

  private get source(): any {
    return this.detail ?? this.place ?? {};
  }

  get thumbUrl(): string {
    const source = this.source;
    const post = source.trending_post ?? source.trendingPost;
    return (
      source.thumbnailUrl ||
      source.thumbnail_url ||
      source.imageUrl ||
      source.image_url ||
      source.photoUrl ||
      source.photo_url ||
      source.coverUrl ||
      source.cover_url ||
      post?.media ||
      this.fallbackImageUrl
    );
  }

  get activeCount(): number {
    const source = this.source;
    return source.active_count ?? source.activeCount ?? source.stats?.activeCount ?? 0;
  }

  get postsCount(): number {
    const source = this.source;
    return source.posts_count ?? source.postsCount ?? source.stats?.postsCount ?? 0;
  }

  get checkinsCount(): number {
    const source = this.source;
    return source.checkins_count ?? source.checkinsCount ?? source.stats?.checkinsCount ?? 0;
  }

  get reasonLabel(): string {
    const source = this.source;
    return source.reason_label ?? source.reasonLabel ?? '';
  }

  get post(): any {
    const source = this.source;
    return source.trending_post ?? source.trendingPost ?? null;
  }

  get activeUsers(): RlsInlineUser[] {
    const users = this.source.active_users ?? this.source.activeUsers;
    return Array.isArray(users) ? users.slice(0, 4) : [];
  }

  categoryLabel(category: string): string {
    const labels: Record<string, string> = {
      food: 'Đồ ăn',
      cafe: 'Cafe',
      event: 'Sự kiện',
      nightlife: 'Nightlife',
      campus: 'Campus',
      other: 'Địa điểm',
    };
    return labels[category] ?? category;
  }

  userName(user: RlsInlineUser): string {
    return user.name || user.username || 'Người dùng';
  }

  userAvatar(user: RlsInlineUser): string | null {
    return user.avatar_url || user.avatarUrl || null;
  }

  userInitial(user: RlsInlineUser): string {
    return this.userName(user).charAt(0).toUpperCase();
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src.endsWith(this.fallbackImageUrl)) return;
    img.src = this.fallbackImageUrl;
  }

  onClose(): void {
    this.close.emit();
  }
}
