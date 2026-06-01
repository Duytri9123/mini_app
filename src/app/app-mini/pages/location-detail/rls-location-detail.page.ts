import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

import { RlsApiService } from '../../core/services/rls-api.service';
import { RlsFeedService } from '../../core/services/rls-feed.service';
import { RlsToastService } from '../../core/services/rls-toast.service';
import { RlsFeedCardComponent } from '../../shared/components/rls-feed-card/rls-feed-card.component';
import { RLS_API } from '../../core/constants/rls-config.constants';
import { RlsLocation, RlsPost, RlsReactionType } from '../../core/interfaces';

type RlsLocationDetailView = RlsLocation & {
  coverUrl?: string | null;
  address?: string | null;
  checkinsCount?: number;
  postsCount?: number;
  heatScore?: number;
};

/**
 * RlsLocationDetailPage — chi tiết địa điểm + feed bài đăng tại địa điểm (task 5.3).
 *
 * Route: /app-mini/location/:id
 *
 * Tính năng:
 *  - Hiển thị thông tin địa điểm (tên, ảnh, địa chỉ, stats)
 *  - Feed bài đăng scoped theo location (R5.1)
 *  - React / bỏ react (R5.5)
 *
 * _Requirements: 5.1, 5.5_
 */
@Component({
  selector: 'rls-location-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, RlsFeedCardComponent],
  templateUrl: './rls-location-detail.page.html',
  styleUrls: ['./rls-location-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsLocationDetailPage implements OnInit, OnDestroy {
  location: RlsLocationDetailView | null = null;
  posts: RlsPost[] = [];
  loadingLocation = true;
  loadingFeed = false;
  hasMore = false;
  locationId = 0;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly api: RlsApiService,
    private readonly feedService: RlsFeedService,
    private readonly toast: RlsToastService,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.locationId = Number(this.route.snapshot.paramMap.get('id') ?? 0);

    // Lắng nghe feed state
    this.feedService.feed$
      .pipe(takeUntil(this.destroy$))
      .subscribe((posts) => {
        this.posts = posts;
        this.cdr.markForCheck();
      });

    this.feedService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loadingFeed = loading;
        this.cdr.markForCheck();
      });

    this.feedService.hasMore$
      .pipe(takeUntil(this.destroy$))
      .subscribe((hasMore) => {
        this.hasMore = hasMore;
        this.cdr.markForCheck();
      });

    // Tải thông tin địa điểm
    const detailPath = RLS_API.LOCATION_DETAIL.replace(':id', String(this.locationId));
    this.api
      .get<RlsLocationDetailView>(detailPath)
      .pipe(
        catchError(() => {
          this.toast.error('Không thể tải thông tin địa điểm.');
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((loc) => {
        this.location = loc;
        this.loadingLocation = false;
        this.cdr.markForCheck();
      });

    // Tải feed của địa điểm
    this.feedService
      .loadFeed({ scope: 'location', ref: this.locationId, limit: 20 })
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.feedService.reset();
  }

  onLoadMore(): void {
    if (!this.hasMore || this.loadingFeed) return;
    this.feedService
      .loadMore()
      .pipe(catchError(() => of([])), takeUntil(this.destroy$))
      .subscribe();
  }

  onReact(postId: number, type: RlsReactionType): void {
    this.feedService
      .react(postId, type)
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe();
  }

  trackByPost(_: number, post: RlsPost): number {
    return post.id;
  }
}
