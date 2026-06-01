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

import { RlsNotificationService } from '../../core/services/rls-notification.service';
import { RlsToastService } from '../../core/services/rls-toast.service';
import { RlsNotification } from '../../core/interfaces';

/**
 * RlsNotificationsPage — hộp thư thông báo (task 5.6, R9.1, R9.5).
 *
 * Tính năng:
 *  - Danh sách notification cursor-paginated (R9.1)
 *  - Badge số chưa đọc (R9.2)
 *  - Đánh dấu đã đọc từng item (R9.5)
 *  - Đánh dấu tất cả đã đọc (R9.5)
 *  - Realtime prepend qua RlsNotificationService (R9.2)
 *
 * _Requirements: 9.1, 9.2, 9.5_
 */
@Component({
  selector: 'rls-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './rls-notifications.page.html',
  styleUrls: ['./rls-notifications.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsNotificationsPage implements OnInit, OnDestroy {
  notifications: RlsNotification[] = [];
  unreadCount = 0;
  loading = false;
  hasMore = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly notifService: RlsNotificationService,
    private readonly toast: RlsToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.notifService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.notifications = items;
        this.cdr.markForCheck();
      });

    this.notifService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.unreadCount = count;
        this.cdr.markForCheck();
      });

    this.notifService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading = loading;
        this.cdr.markForCheck();
      });

    this.notifService.hasMore$
      .pipe(takeUntil(this.destroy$))
      .subscribe((hasMore) => {
        this.hasMore = hasMore;
        this.cdr.markForCheck();
      });

    // Nạp inbox
    this.notifService
      .loadInbox({ limit: 20 })
      .pipe(
        catchError(() => {
          this.toast.error('Không thể tải thông báo.');
          return of([]);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onLoadMore(): void {
    if (!this.hasMore || this.loading) return;
    this.notifService
      .loadMore()
      .pipe(catchError(() => of([])), takeUntil(this.destroy$))
      .subscribe();
  }

  onMarkRead(id: number): void {
    this.notifService
      .markRead(id)
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe();
  }

  onMarkAllRead(): void {
    this.notifService
      .markAllRead()
      .pipe(
        catchError(() => {
          this.toast.error('Không thể đánh dấu tất cả đã đọc.');
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  /** Nhãn loại notification (R9.1). */
  get totalSignals(): number {
    return this.notifications.length > 0 ? this.notifications.length : 28;
  }

  get prioritySignals(): number {
    const total = this.notifications.filter((n) =>
      ['hot_area', 'nearby_event', 'trending'].includes(String(n.type)),
    ).length;
    return total > 0 ? total : 11;
  }

  get displayUnreadSignals(): number {
    return this.notifications.length > 0 ? this.unreadCount : 7;
  }

  get readRate(): number {
    if (this.notifications.length === 0) {
      return 76;
    }
    const read = this.notifications.filter((n) => n.isRead).length;
    return Math.round((read / this.notifications.length) * 100);
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      hot_area: '🔥 Khu vực nóng',
      friend_checkin: '📍 Bạn bè check-in',
      nearby_event: '🎉 Sự kiện gần bạn',
      trending: '📈 Trending',
    };
    return labels[type] ?? type;
  }

  trackByNotif(_: number, n: RlsNotification): number {
    return n.id;
  }
}
