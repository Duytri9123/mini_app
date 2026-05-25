import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

/**
 * Interceptor xử lý 401 Unauthorized:
 * - Khi API trả 401, xóa token hết hạn khỏi localStorage.
 * - Chỉ redirect về login nếu user đang ở trang yêu cầu auth
 *   (bookings, wallet, vehicles, profile, member, booking/*, notifications).
 * - KHÔNG redirect nếu đang ở trang public (home, explore, station, settings).
 */
@Injectable()
export class BjAuthInterceptor implements HttpInterceptor {
  /** Routes yêu cầu phải đăng nhập — nếu 401 ở đây thì redirect */
  private readonly PROTECTED_PATHS = [
    '/bro-jet/bookings',
    '/bro-jet/booking/',
    '/bro-jet/wallet',
    '/bro-jet/vehicles',
    '/bro-jet/profile',
    '/bro-jet/member',
    '/bro-jet/notifications',
    '/bro-jet/voucher',
    '/bro-jet/support-chat',
  ];

  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          const url = req.url.toLowerCase();

          // Không xử lý cho các endpoint auth
          const isAuthEndpoint = url.includes('/auth/login') ||
                                  url.includes('/auth/register') ||
                                  url.includes('/auth/forgot-password') ||
                                  url.includes('/auth/reset-password') ||
                                  url.includes('/auth/google');

          if (!isAuthEndpoint) {
            // Xóa token hết hạn
            localStorage.removeItem('bj_access_token');
            localStorage.removeItem('bj_refresh_token');
            localStorage.removeItem('bj_user');

            // Chỉ redirect nếu đang ở trang protected
            const currentUrl = this.router.url;
            const isOnProtectedPage = this.PROTECTED_PATHS.some(p => currentUrl.startsWith(p));

            if (isOnProtectedPage) {
              this.router.navigate(['/bro-jet/login'], {
                queryParams: { returnUrl: currentUrl },
                replaceUrl: true,
              });
            }
          }
        }
        return throwError(() => error);
      })
    );
  }
}
