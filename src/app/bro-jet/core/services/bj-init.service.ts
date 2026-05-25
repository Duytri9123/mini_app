import { Injectable } from '@angular/core';
import { BjAuthService } from './bj-auth.service';
import { BjPermissionService } from './bj-permission.service';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class BjInitService {
  private initialized = false;
  private initializingPromise: Promise<void> | null = null;

  constructor(
    private authService: BjAuthService,
    private permissionService: BjPermissionService,
  ) {}

  /**
   * Khởi tạo ứng dựng: Đồng bộ thông tin user từ token nếu có
   * + Xin quyền camera & vị trí
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initializingPromise) return this.initializingPromise;

    this.initializingPromise = this.doInit();
    return this.initializingPromise;
  }

  private async doInit(): Promise<void> {
    // Xin quyền camera + location ngay khi vào app
    this.permissionService.requestAll();

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(
          this.authService.syncCurrentUser().pipe(
            catchError(err => {
              console.error('Failed to sync user on init:', err);
              return of(null);
            })
          )
        );
      } catch (e) {
        console.error('Error during BjInitService.init', e);
      }
    }

    this.initialized = true;
    this.initializingPromise = null;
  }
}
