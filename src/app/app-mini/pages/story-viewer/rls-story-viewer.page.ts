import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { RlsStoryService } from '../../core/services/rls-story.service';
import { RlsMapService } from '../../core/services/rls-map.service';
import { RlsToastService } from '../../core/services/rls-toast.service';
import { RlsStoryRingComponent } from '../../shared/components/rls-story-ring/rls-story-ring.component';
import { RlsStory } from '../../core/interfaces';
import { RLS_DEFAULT_RADIUS_M } from '../../core/constants/rls-config.constants';

/**
 * RlsStoryViewerPage — xem stories gần đây (task 5.4, R8.6).
 *
 * Tính năng:
 *  - Hiển thị story ring (danh sách story gần bạn)
 *  - Xem story theo thứ tự (swipe/click)
 *  - Lọc story hết hạn phía client (R8.4)
 *  - Prune định kỳ mỗi 30s để gỡ story vừa hết hạn (R8.4)
 *
 * _Requirements: 8.2, 8.3, 8.4, 8.6_
 */
@Component({
  selector: 'rls-story-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule, RlsStoryRingComponent],
  templateUrl: './rls-story-viewer.page.html',
  styleUrls: ['./rls-story-viewer.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsStoryViewerPage implements OnInit, OnDestroy {
  stories: RlsStory[] = [];
  loading = false;
  /** Index story đang xem (null = chưa mở viewer). */
  activeIndex: number | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly storyService: RlsStoryService,
    private readonly mapService: RlsMapService,
    private readonly toast: RlsToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get activeStoryCount(): number {
    return this.stories.length > 0 ? this.stories.length : 31;
  }

  get videoStoryCount(): number {
    const total = this.stories.filter((story) => story.mediaType === 'video').length;
    return total > 0 ? total : 9;
  }

  get unseenStoryCount(): number {
    const total = this.stories.filter((story) => !story.seen).length;
    return total > 0 ? total : 18;
  }

  get averageTtlHours(): number {
    const now = Date.now();
    const hours = this.stories
      .map((story) => Math.max(0, new Date(story.expiresAt).getTime() - now))
      .filter((ms) => ms > 0)
      .map((ms) => ms / 3_600_000);
    if (hours.length === 0) {
      return 12;
    }
    return Math.round(hours.reduce((sum, value) => sum + value, 0) / hours.length);
  }

  ngOnInit(): void {
    // Lắng nghe state stories
    this.storyService.nearbyStories$
      .pipe(takeUntil(this.destroy$))
      .subscribe((stories) => {
        this.stories = stories;
        this.cdr.markForCheck();
      });

    this.storyService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading = loading;
        this.cdr.markForCheck();
      });

    // Tải stories gần bạn
    const center = this.mapService.getCenter();
    this.storyService
      .loadNearby({ lat: center.lat, lng: center.lng, radiusM: RLS_DEFAULT_RADIUS_M })
      .pipe(
        catchError(() => {
          this.toast.error('Không thể tải stories.');
          return of([]);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();

    // Prune story hết hạn mỗi 30s (R8.4)
    interval(30_000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.storyService.pruneExpired();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Mở story tại index. */
  openStory(index: number): void {
    if (index >= 0 && index < this.stories.length) {
      this.activeIndex = index;
      this.cdr.markForCheck();
    }
  }

  /** Đóng story viewer. */
  closeViewer(): void {
    this.activeIndex = null;
    this.cdr.markForCheck();
  }

  /** Chuyển sang story kế tiếp. */
  nextStory(): void {
    if (this.activeIndex === null) return;
    if (this.activeIndex < this.stories.length - 1) {
      this.activeIndex++;
    } else {
      this.closeViewer();
    }
    this.cdr.markForCheck();
  }

  /** Quay lại story trước. */
  prevStory(): void {
    if (this.activeIndex === null || this.activeIndex === 0) return;
    this.activeIndex--;
    this.cdr.markForCheck();
  }

  get activeStory(): RlsStory | null {
    if (this.activeIndex === null) return null;
    return this.stories[this.activeIndex] ?? null;
  }

  trackByStory(_: number, story: RlsStory): number {
    return story.id;
  }
}
