import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { API_URL } from 'src/environments/environment';

/** Khóa lưu token Sanctum của app-mini (mirror quy ước `bj_access_token`). */
export const RLS_ACCESS_TOKEN = 'rls_access_token';
/** Khóa lưu profile user hiện tại của app-mini. */
export const RLS_USER_KEY = 'rls_user';

/**
 * RlsAuthInterceptor — mirror `BjAuthInterceptor` cho module `app-mini`.
 *
 * Trách nhiệm:
 * - Gắn `Authorization: Bearer <rls_access_token>` cho mọi request đi tới backend
 *   (`API_URL` suy ra từ `BASE_URL` trong `environment.ts`). Không đụng request
 *   tới host khác (asset, bên thứ ba) và không ghi đè header `Authorization` có sẵn.
 * - Xử lý 401 Unauthorized: xóa token đã hết hạn khỏi storage, và CHỈ redirect về
 *   `/app-mini/login` khi user đang ở route protected (feed cá nhân, profile,
 *   notifications, đăng bài...). Route public (home-map, trending) không redirect.
 *
 * Interceptor được provide qua `HTTP_INTERCEPTORS` (multi: true) trong
 * `AppMiniModule` để scope theo module — KHÔNG ảnh hưởng `gap-move`/`bro-jet`.
 *
 * _Requirements: 1.4, 1.5, 14.4_
 * _Design: 9.5 Auth interceptor_
 */
@Injectable()
export class RlsAuthInterceptor implements HttpInterceptor {
  /** Routes yêu cầu đăng nhập — nếu 401 ở đây thì redirect về login. */
  private readonly PROTECTED_PATHS = [
    '/app-mini/feed',
    '/app-mini/friends',
    '/app-mini/profile',
    '/app-mini/notifications',
    '/app-mini/local-feed',
    '/app-mini/location-detail',
    '/app-mini/story-viewer',
    '/app-mini/compose',
    '/app-mini/post',
  ];

  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authReq = this.attachToken(req);

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.handleUnauthorized(req);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Gắn Bearer token cho request hướng tới backend (API_URL). Bỏ qua nếu:
   * - request không nhắm tới backend của chúng ta, hoặc
   * - đã có sẵn header Authorization, hoặc
   * - không có token trong storage.
   */
  private attachToken(req: HttpRequest<any>): HttpRequest<any> {
    if (!req.url.startsWith(API_URL)) {
      return req;
    }
    if (req.headers.has('Authorization')) {
      return req;
    }

    const token = localStorage.getItem(RLS_ACCESS_TOKEN);
    if (!token) {
      return req;
    }

    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Xử lý 401: xóa session đã hết hạn rồi điều hướng về login nếu đang ở route
   * protected. Bỏ qua các endpoint auth để tránh redirect khi login/register sai.
   */
  private handleUnauthorized(req: HttpRequest<any>): void {
    const url = req.url.toLowerCase();

    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/phone/') ||
      url.includes('/auth/google');

    if (isAuthEndpoint) {
      return;
    }

    // Xóa token hết hạn + profile.
    localStorage.removeItem(RLS_ACCESS_TOKEN);
    localStorage.removeItem(RLS_USER_KEY);

    // Chỉ redirect nếu đang ở trang protected.
    const currentUrl = this.router.url;
    const isOnProtectedPage = this.PROTECTED_PATHS.some((p) =>
      currentUrl.startsWith(p)
    );

    if (isOnProtectedPage) {
      this.router.navigate(['/app-mini/login'], {
        queryParams: { returnUrl: currentUrl },
        replaceUrl: true,
      });
    }
  }
}
