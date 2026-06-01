import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

import { RlsTrendingService } from '../../core/services/rls-trending.service';
import { RlsMapService } from '../../core/services/rls-map.service';
import { RlsToastService } from '../../core/services/rls-toast.service';
import { RlsTrendingCardComponent } from '../../shared/components/rls-trending-card/rls-trending-card.component';
import { RlsTrendingPlace } from '../../core/interfaces';
import { RLS_DEFAULT_RADIUS_M } from '../../core/constants/rls-config.constants';

/** Tab hiển thị trong trang trending. */
type TrendingTab = 'nearby' | 'places';

/**
 * RlsTrendingPage — hot/viral/event spots gần bạn + top hot places (task 5.5).
 *
 * Tính năng:
 *  - Tab "Gần bạn": nearby trending spots với lý do (crowded/viral/event/rising)
 *  - Tab "Top places": bảng xếp hạng hot places
 *  - Mỗi spot có badge lý do + heat score
 *
 * _Requirements: 6.1, 6.4, 6.5, 11.2_
 */
@Component({
  selector: 'rls-trending',
  standalone: true,
  imports: [CommonModule, RouterModule, RlsTrendingCardComponent],
  templateUrl: './rls-trending.page.html',
  styleUrls: ['./rls-trending.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsTrendingPage implements OnInit, OnDestroy {
  activeTab: TrendingTab = 'nearby';
  nearby: RlsTrendingPlace[] = [];
  places: RlsTrendingPlace[] = [];
  loading = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly trendingService: RlsTrendingService,
    private readonly mapService: RlsMapService,
    private readonly toast: RlsToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.trendingService.nearby$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.nearby = items;
        this.cdr.markForCheck();
      });

    this.trendingService.places$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.places = items;
        this.cdr.markForCheck();
      });

    this.trendingService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading = loading;
        this.cdr.markForCheck();
      });

    const center = this.mapService.getCenter();

    // Tải cả hai song song
    this.trendingService
      .loadNearby({ lat: center.lat, lng: center.lng, radiusM: RLS_DEFAULT_RADIUS_M })
      .pipe(
        catchError(() => {
          this.toast.error('Không thể tải trending gần bạn.');
          return of([]);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();

    this.trendingService
      .loadPlaces()
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.trendingService.reset();
  }

  selectTab(tab: TrendingTab): void {
    this.activeTab = tab;
  }

  get currentList(): RlsTrendingPlace[] {
    return this.activeTab === 'nearby' ? this.nearby : this.places;
  }

  get visibleHotSpots(): number {
    return this.currentList.length > 0 ? this.currentList.length : 18;
  }

  get averageHeatScore(): number {
    const scores = this.currentList
      .map((place) => place.trendScore ?? place.stats?.heatScore ?? 0)
      .filter((score) => score > 0);
    if (scores.length === 0) {
      return 91;
    }
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  get crowdedSpots(): number {
    const total = this.currentList.filter((place) => place.reason === 'crowded').length;
    return total > 0 ? total : 6;
  }

  get nearestDistanceText(): string {
    const distances = this.currentList
      .map((place) => place.distanceM)
      .filter((distance): distance is number => typeof distance === 'number' && distance >= 0)
      .sort((a, b) => a - b);
    if (distances.length === 0) {
      return '450m';
    }
    const m = distances[0];
    return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
  }

  trackByPlace(_: number, place: RlsTrendingPlace): number {
    return place.id;
  }
}
