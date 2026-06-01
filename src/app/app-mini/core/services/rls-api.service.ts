import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_URL } from 'src/environments/environment';
import { RlsApiEnvelope } from '../interfaces';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — HTTP wrapper service.
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirror `BjApiService`: bọc `HttpClient` quanh host backend lấy từ `API_URL`
 * trong `environment.ts` (KHÔNG hardcode URL — R14.3, R16.1). Đây là điểm vào
 * HTTP duy nhất cho các core service khác (`RlsAuthService`, `RlsFeedService`,
 * `RlsMapService`...) để chúng chỉ làm việc với payload đã bóc bao bì.
 *
 * Khác `BjApiService` ở hai điểm có chủ đích:
 *  1. KHÔNG tự gắn `Authorization` header — `RlsAuthInterceptor`
 *     (`HTTP_INTERCEPTORS`, module-scoped trong `AppMiniModule`) đã đảm nhiệm
 *     việc đính kèm Bearer `rls_access_token` và xử lý 401. Gắn lại ở đây sẽ
 *     trùng lặp và phá vỡ single-source cho auth.
 *  2. Bóc bao bì chuẩn `{ data, meta?, message? }` (design.md §6): các method
 *     mặc định trả thẳng `data` (đã typed); biến thể `*Envelope` trả nguyên
 *     envelope khi cần `meta` (cursor pagination) hoặc `message`.
 *
 * Endpoint truyền vào là path tương đối (ví dụ `'/auth/login'`, `'feed'`); host
 * `API_URL` được nối ở đây nên không nơi nào khác cần biết base URL.
 *
 * _Requirements: 14.3, 16.1_
 * _Design: 9.4 Core services — RlsApiService_
 */
@Injectable({ providedIn: 'root' })
export class RlsApiService {
  /** Host API suy ra từ `BASE_URL` trong `environment.ts` (ví dụ `https://.../api`). */
  private readonly apiUrl = API_URL;

  constructor(private http: HttpClient) {}

  // ───────────────────────────── Public: data-only ─────────────────────────────
  // Trả thẳng payload `data` đã bóc bao bì — dùng cho phần lớn lời gọi.

  /** GET → trả `data` của envelope. `params` được chuyển thành query string. */
  get<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Observable<T> {
    return this.unwrap(this.getEnvelope<T>(endpoint, params));
  }

  /** POST → trả `data` của envelope. */
  post<T = unknown>(endpoint: string, body?: unknown): Observable<T> {
    return this.unwrap(this.postEnvelope<T>(endpoint, body));
  }

  /** PUT → trả `data` của envelope. */
  put<T = unknown>(endpoint: string, body?: unknown): Observable<T> {
    return this.unwrap(this.putEnvelope<T>(endpoint, body));
  }

  /** PATCH → trả `data` của envelope. */
  patch<T = unknown>(endpoint: string, body?: unknown): Observable<T> {
    return this.unwrap(this.patchEnvelope<T>(endpoint, body));
  }

  /** DELETE → trả `data` của envelope. */
  delete<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Observable<T> {
    return this.unwrap(this.deleteEnvelope<T>(endpoint, params));
  }

  // ───────────────────────────── Public: full envelope ─────────────────────────
  // Trả nguyên `{ data, meta?, message? }` — dùng khi cần `meta`/`message`
  // (ví dụ cursor pagination cho feed/notifications).

  getEnvelope<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Observable<RlsApiEnvelope<T>> {
    return this.http.get<RlsApiEnvelope<T>>(this.buildUrl(endpoint), {
      params: this.buildParams(params),
    });
  }

  postEnvelope<T = unknown>(
    endpoint: string,
    body?: unknown
  ): Observable<RlsApiEnvelope<T>> {
    return this.http.post<RlsApiEnvelope<T>>(this.buildUrl(endpoint), body ?? {});
  }

  putEnvelope<T = unknown>(
    endpoint: string,
    body?: unknown
  ): Observable<RlsApiEnvelope<T>> {
    return this.http.put<RlsApiEnvelope<T>>(this.buildUrl(endpoint), body ?? {});
  }

  patchEnvelope<T = unknown>(
    endpoint: string,
    body?: unknown
  ): Observable<RlsApiEnvelope<T>> {
    return this.http.patch<RlsApiEnvelope<T>>(this.buildUrl(endpoint), body ?? {});
  }

  deleteEnvelope<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Observable<RlsApiEnvelope<T>> {
    return this.http.delete<RlsApiEnvelope<T>>(this.buildUrl(endpoint), {
      params: this.buildParams(params),
    });
  }

  // ───────────────────────────────── Helpers ───────────────────────────────────

  /**
   * Nối `API_URL` với endpoint tương đối, chuẩn hoá dấu `/` để không sinh `//`.
   * Cho phép truyền cả `'/auth/login'` (kiểu `RLS_API`) lẫn `'feed'`.
   */
  private buildUrl(endpoint: string): string {
    const base = this.apiUrl.replace(/\/+$/, '');
    const path = endpoint.replace(/^\/+/, '');
    return `${base}/${path}`;
  }

  /**
   * Dựng `HttpParams` từ object phẳng. Bỏ qua `undefined`/`null` để không gửi
   * query rỗng; mảng được lặp thành nhiều cặp cùng key (ví dụ `types=a&types=b`).
   */
  private buildParams(params?: Record<string, unknown>): HttpParams {
    let httpParams = new HttpParams();
    if (!params) {
      return httpParams;
    }
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null) {
            httpParams = httpParams.append(key, String(item));
          }
        }
      } else {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }

  /**
   * Bóc bao bì `{ data, meta?, message? }` → `data`. Phòng thủ với response
   * không-bọc (một số endpoint/legacy có thể trả thẳng payload): nếu thiếu khoá
   * `data` thì trả nguyên body.
   */
  private unwrap<T>(source: Observable<RlsApiEnvelope<T>>): Observable<T> {
    return source.pipe(
      map((res) => {
        if (res != null && typeof res === 'object' && 'data' in res) {
          return (res as RlsApiEnvelope<T>).data;
        }
        return res as unknown as T;
      })
    );
  }
}
