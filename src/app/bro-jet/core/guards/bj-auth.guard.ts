import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BjAuthService } from '../services/bj-auth.service';

/**
 * Guard bảo vệ các route yêu cầu đăng nhập.
 * Nếu chưa đăng nhập → redirect về /bro-jet/login và lưu returnUrl.
 */
export const bjAuthGuard: CanActivateFn = (route, state) => {
  const auth = inject(BjAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Lưu URL muốn vào để sau khi login redirect lại
  router.navigate(['/bro-jet/login'], {
    queryParams: { returnUrl: state.url },
    replaceUrl: true,
  });
  return false;
};
