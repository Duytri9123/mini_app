import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RlsAuthService } from '../services/rls-auth.service';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Route guard cho các route protected.
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirror `bjAuthGuard` (functional `CanActivateFn`). Bảo vệ các route cá nhân
 * (profile, feed cá nhân, compose, notifications...). Nếu chưa đăng nhập (không
 * có `rls_access_token`) → redirect `/app-mini/login` kèm `returnUrl` để sau khi
 * login quay lại đúng trang.
 *
 * Bổ trợ cho `RlsAuthInterceptor`: interceptor xử lý 401 RUNTIME (token hết hạn
 * giữa chừng), còn guard chặn TRƯỚC khi điều hướng vào route protected khi chưa
 * có phiên. Hai cơ chế cùng dùng một nguồn sự thật (`RlsAuthService`).
 *
 * _Requirements: 1.5, 14.4_
 * _Design: 9.5 Auth interceptor / 9.4 Core services_
 */
export const rlsAuthGuard: CanActivateFn = (_route, state) => {
  const auth = inject(RlsAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  router.navigate(['/app-mini/login'], {
    queryParams: { returnUrl: state.url },
    replaceUrl: true,
  });
  return false;
};
