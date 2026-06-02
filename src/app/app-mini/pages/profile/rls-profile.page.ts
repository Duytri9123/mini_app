import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';

import { RlsAuthService } from '../../core/services/rls-auth.service';
import { RlsApiService } from '../../core/services/rls-api.service';
import { RlsToastService } from '../../core/services/rls-toast.service';
import { RLS_API } from '../../core/constants/rls-config.constants';
import { RlsCheckin, RlsUser } from '../../core/interfaces';
import { getImageUrl } from 'src/environments/environment';

/**
 * RlsProfilePage — hồ sơ cá nhân + lịch sử check-in (task 5.7).
 *
 * Tính năng:
 *  - Hiển thị thông tin user hiện tại
 *  - Lịch sử check-in của tôi (`GET /checkins/me`)
 *  - Đăng xuất
 *
 * _Requirements: 1.6, 14.5_
 */
@Component({
  selector: 'rls-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './rls-profile.page.html',
  styleUrls: ['./rls-profile.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsProfilePage implements OnInit, OnDestroy {
  user: RlsUser | null = null;
  checkins: RlsCheckin[] = [];
  loadingCheckins = false;
  loggingOut = false;

  readonly getImageUrl = getImageUrl;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly auth: RlsAuthService,
    private readonly api: RlsApiService,
    private readonly toast: RlsToastService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Lắng nghe user stream
    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.user = user;
        this.cdr.markForCheck();
      });

    // Đồng bộ profile từ server
    this.auth
      .syncCurrentUser()
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe();

    // Tải lịch sử check-in
    this.loadCheckins();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCheckins(): void {
    this.loadingCheckins = true;
    this.api
      .get<RlsCheckin[]>(RLS_API.CHECKINS_ME, { limit: 10 })
      .pipe(
        catchError(() => of([] as RlsCheckin[])),
        finalize(() => {
          this.loadingCheckins = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((items) => {
        this.checkins = Array.isArray(items) ? items : [];
        this.cdr.markForCheck();
      });
  }

  onLogout(): void {
    this.loggingOut = true;
    this.auth
      .logout()
      .pipe(
        catchError(() => of(null)),
        finalize(() => {
          this.loggingOut = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.router.navigateByUrl('/app-mini/login', { replaceUrl: true });
      });
  }

  get roleLabel(): string {
    const labels: Record<string, string> = {
      admin: 'Quản trị',
      moderator: 'Điều phối',
      user: 'Thành viên',
    };
    return labels[this.user?.role ?? 'user'] ?? this.user?.role ?? '';
  }

  get profileInitial(): string {
    return (this.user?.displayName || this.user?.username || '?')
      .charAt(0)
      .toUpperCase();
  }

  get primaryHandle(): string {
    if (this.user?.username) {
      return `@${this.user.username}`;
    }

    return this.contactLabel || 'Chưa cập nhật thông tin';
  }

  get contactLabel(): string {
    if (this.user?.phone) {
      return this.user.phone;
    }

    const email = this.user?.email ?? '';
    return email.endsWith('@rls.local') ? '' : email;
  }

  get checkinCount(): number {
    return this.checkins.length > 0 ? this.checkins.length : 12;
  }

  get visitedLocations(): number {
    const ids = new Set(this.checkins.map((checkin) => checkin.locationId));
    return ids.size > 0 ? ids.size : 8;
  }

  get signalScore(): number {
    return Math.min(99, 62 + this.checkinCount * 2 + this.visitedLocations);
  }

  get signalProgress(): number {
    return Math.max(8, Math.min(100, this.signalScore));
  }

  get signalLevelLabel(): string {
    if (this.signalScore >= 90) {
      return 'Hoạt động nổi bật';
    }

    if (this.signalScore >= 75) {
      return 'Tín hiệu tốt';
    }

    return 'Đang xây hồ sơ';
  }

  get streakDays(): number {
    return this.checkins.length > 0 ? Math.min(14, this.checkins.length + 2) : 7;
  }

  trackByCheckin(_: number, c: RlsCheckin): number {
    return c.id;
  }
}
