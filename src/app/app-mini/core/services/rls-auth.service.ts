import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { RlsApiService } from './rls-api.service';
import {
  RLS_ACCESS_TOKEN,
  RLS_USER_KEY,
} from '../interceptors/rls-auth.interceptor';
import { RLS_API } from '../constants/rls-config.constants';
import {
  RlsAuthResult,
  RlsGoogleRequest,
  RlsLoginRequest,
  RlsPhoneOtpRequest,
  RlsPhoneOtpVerifyRequest,
  RlsPhoneOtpVerifyResult,
  RlsPhoneProfileRequest,
  RlsRegisterRequest,
  RlsUser,
} from '../interfaces';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Authentication service.
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirror `BjAuthService` cho module `app-mini`. Quản lý vòng đời phiên Sanctum:
 * register / login / Google, lưu `rls_access_token`, phát `currentUser$`, đồng
 * bộ `GET /auth/me`, và logout (thu hồi token server-side + xoá state client).
 *
 * Điểm cố ý khác `BjAuthService`:
 *  1. Đi qua `RlsApiService` (đã bóc bao bì `{ data, ... }`) thay vì `HttpClient`
 *     trực tiếp — host lấy từ `API_URL` trong `environment.ts`, KHÔNG hardcode
 *     URL (R14.3). Đường dẫn endpoint dùng `RLS_API` (single source of truth).
 *  2. KHÔNG tự gắn `Authorization` — `RlsAuthInterceptor` đảm nhiệm việc đính
 *     kèm Bearer `rls_access_token` và xử lý 401 (R1.4, R1.5). Service này chỉ
 *     đọc/ghi storage cùng KHOÁ với interceptor (`RLS_ACCESS_TOKEN`,
 *     `RLS_USER_KEY`) để hai bên không bao giờ lệch nhau.
 *
 * `providedIn: 'root'` (design.md §9.4 — core services dùng root injector).
 *
 * _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 14.4_
 * _Design: 9.4 Core services — RlsAuthService_
 */
@Injectable({ providedIn: 'root' })
export class RlsAuthService {
  /** Stream user hiện tại — khởi tạo từ profile đã lưu (mở app không nháy login). */
  readonly currentUser$ = new BehaviorSubject<RlsUser | null>(this.loadUser());

  /** Thời điểm `syncCurrentUser` thành công gần nhất (cache TTL). */
  private lastSyncAt = 0;
  /** TTL cache cho `/auth/me` (ms). */
  private readonly SYNC_TTL = 60_000;
  /** Lời gọi `/auth/me` đang bay — khử trùng các call song song. */
  private syncInFlight$: Observable<RlsUser> | null = null;

  private readonly api = inject(RlsApiService);

  // ───────────────────────────────── Auth flows ────────────────────────────────

  /**
   * Đăng ký bằng email/password (R1.1). Khi thành công backend trả Sanctum
   * token + profile → lưu phiên ngay. 422 (validation) được đẩy nguyên lên
   * caller để form hiển thị field errors (R1.3 — xử lý ở page).
   */
  register(data: RlsRegisterRequest): Observable<RlsAuthResult> {
    return this.api
      .post<unknown>(RLS_API.REGISTER, data)
      .pipe(map((res) => this.storeSession(res)));
  }

  /** Đăng nhập bằng email/password → Sanctum token + profile (R1.2). */
  login(data: RlsLoginRequest): Observable<RlsAuthResult> {
    return this.api
      .post<unknown>(RLS_API.LOGIN, data)
      .pipe(map((res) => this.storeSession(res)));
  }

  requestPhoneOtp(data: RlsPhoneOtpRequest): Observable<unknown> {
    return this.api.post<unknown>(RLS_API.PHONE_OTP_REQUEST, data);
  }

  verifyPhoneOtp(data: RlsPhoneOtpVerifyRequest): Observable<RlsPhoneOtpVerifyResult> {
    return this.api
      .post<unknown>(RLS_API.PHONE_OTP_VERIFY, data)
      .pipe(map((res) => this.parsePhoneOtpVerify(res)));
  }

  completePhoneProfile(data: RlsPhoneProfileRequest): Observable<RlsAuthResult> {
    return this.api
      .post<unknown>(RLS_API.PHONE_PROFILE_COMPLETE, data)
      .pipe(map((res) => this.storeOrUpdateSession(res)));
  }

  /**
   * Đăng nhập Google (R1.1) — gửi `id_token`/`code` lấy được từ Google Identity
   * cho backend (`GOOGLE_CLIENT_ID` đã cấu hình trong `environment.ts`).
   */
  loginWithGoogle(data: RlsGoogleRequest): Observable<RlsAuthResult> {
    return this.api
      .post<unknown>(RLS_API.GOOGLE, data)
      .pipe(map((res) => this.storeSession(res)));
  }

  /**
   * Đăng xuất (R1.6): thu hồi token hiện tại ở server rồi xoá state client.
   * State client LUÔN được dọn (kể cả khi request lỗi mạng/token đã hết hạn)
   * để không kẹt phiên cũ — dùng `finalize`.
   */
  logout(): Observable<unknown> {
    return this.api.post<unknown>(RLS_API.LOGOUT, {}).pipe(
      finalize(() => this.clearSession()),
    );
  }

  /**
   * Đồng bộ user từ `GET /auth/me` (R1.2 — profile + role). Có cache TTL 60s và
   * khử trùng call song song; `force=true` bỏ qua cache (vd sau khi cập nhật
   * profile). Trả về user đã normalize.
   */
  syncCurrentUser(force = false): Observable<RlsUser> {
    const now = Date.now();
    const cached = this.currentUser$.getValue();

    if (!force && cached && now - this.lastSyncAt < this.SYNC_TTL) {
      return of(cached);
    }
    if (this.syncInFlight$) {
      return this.syncInFlight$;
    }

    this.syncInFlight$ = this.api.get<unknown>(RLS_API.ME).pipe(
      map((res) => this.normalizeUser(this.extractUser(res))),
      tap((user) => {
        this.setUserState(user);
        this.lastSyncAt = Date.now();
      }),
      shareReplay(1),
      finalize(() => {
        this.syncInFlight$ = null;
      }),
    );

    return this.syncInFlight$;
  }

  // ───────────────────────────────── Accessors ─────────────────────────────────

  /** User hiện tại (đồng bộ, từ `BehaviorSubject`). */
  getCurrentUser(): RlsUser | null {
    return this.currentUser$.getValue();
  }

  /** Cập nhật profile cục bộ (vd sau khi sửa thông tin) và phát lại stream. */
  updateCurrentUser(user: unknown): RlsUser {
    const normalized = this.normalizeUser(user);
    this.setUserState(normalized);
    return normalized;
  }

  /** Có token trong storage hay không (dùng cho `RlsAuthGuard`, R1.5). */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /** Token Sanctum hiện tại (hoặc `null`). */
  getAccessToken(): string | null {
    return localStorage.getItem(RLS_ACCESS_TOKEN);
  }

  /** Vai trò user hiện tại (mặc định `user` khi chưa rõ). */
  getRole(): string {
    return this.getCurrentUser()?.role ?? 'user';
  }

  // ───────────────────────────── Session persistence ───────────────────────────

  /**
   * Lưu phiên từ payload `data` của `register|login|google`: ghi token +
   * normalize & phát user. Trả về `RlsAuthResult` cho caller. Ném lỗi nếu thiếu
   * `access_token` (response không hợp lệ) để caller không tưởng nhầm đã login.
   */
  private storeSession(payload: unknown): RlsAuthResult {
    const obj = (payload ?? {}) as Record<string, unknown>;
    const accessToken =
      (obj['access_token'] as string) ?? (obj['token'] as string) ?? '';

    if (!accessToken) {
      throw new Error('RlsAuthService: response thiếu access_token.');
    }

    localStorage.setItem(RLS_ACCESS_TOKEN, accessToken);
    const tokenType = (obj['token_type'] as string) ?? 'Bearer';

    const user = this.normalizeUser(this.extractUser(payload));
    this.setUserState(user);

    return { accessToken, tokenType, user };
  }

  private storeOrUpdateSession(payload: unknown): RlsAuthResult {
    const obj = (payload ?? {}) as Record<string, unknown>;
    const accessToken =
      (obj['access_token'] as string) ?? (obj['token'] as string) ?? '';

    if (accessToken) {
      return this.storeSession(payload);
    }

    const existingToken = this.getAccessToken();
    if (!existingToken) {
      throw new Error('RlsAuthService: response thiếu access_token.');
    }

    const user = this.normalizeUser(this.extractUser(payload));
    this.setUserState(user);
    return { accessToken: existingToken, tokenType: 'Bearer', user };
  }

  private parsePhoneOtpVerify(payload: unknown): RlsPhoneOtpVerifyResult {
    const obj = (payload ?? {}) as Record<string, unknown>;
    const requiresProfile = Boolean(
      obj['requires_profile'] ??
        obj['requiresProfile'] ??
        obj['profile_required'] ??
        obj['profileRequired'] ??
        obj['is_new_user'] ??
        obj['isNewUser'] ??
        obj['needs_profile'] ??
        obj['needsProfile'] ??
        false,
    );
    const onboardingToken =
      (obj['onboarding_token'] as string) ??
      (obj['onboardingToken'] as string) ??
      (obj['registration_token'] as string) ??
      (obj['registrationToken'] as string) ??
      null;
    const hasAccessToken = Boolean(
      (obj['access_token'] as string) ?? (obj['token'] as string),
    );

    if (!hasAccessToken) {
      return { requiresProfile: true, onboardingToken, auth: null };
    }

    const auth = this.storeSession(payload);
    return { requiresProfile, onboardingToken, auth };
  }

  /** Xoá toàn bộ state phiên (token + profile + cache) và phát `null`. */
  private clearSession(): void {
    localStorage.removeItem(RLS_ACCESS_TOKEN);
    localStorage.removeItem(RLS_USER_KEY);
    this.lastSyncAt = 0;
    this.syncInFlight$ = null;
    this.currentUser$.next(null);
  }

  /** Ghi profile xuống storage + phát qua stream. */
  private setUserState(user: RlsUser | null): void {
    if (user) {
      localStorage.setItem(RLS_USER_KEY, JSON.stringify(user));
    }
    this.currentUser$.next(user);
  }

  /** Đọc profile đã lưu lúc khởi tạo service (giữ phiên qua reload). */
  private loadUser(): RlsUser | null {
    try {
      const raw = localStorage.getItem(RLS_USER_KEY);
      if (!raw) {
        return null;
      }
      return this.normalizeUser(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  /**
   * Lấy object user thô từ nhiều hình dạng response: `{ user }`, hoặc thẳng
   * object user (vd `/auth/me` trả thẳng profile).
   */
  private extractUser(payload: unknown): unknown {
    if (payload && typeof payload === 'object' && 'user' in payload) {
      return (payload as { user: unknown }).user;
    }
    return payload;
  }

  /**
   * Chuẩn hoá user thô (snake_case backend HOẶC camelCase đã lưu) về `RlsUser`.
   * Đây là chỗ DUY NHẤT ánh xạ field nên consumer chỉ thấy một hình dạng ổn định.
   */
  private normalizeUser(raw: unknown): RlsUser {
    const u = (raw ?? {}) as Record<string, unknown>;

    const displayName =
      ((u['display_name'] ?? u['displayName'] ?? u['name'] ?? '') as string).trim();
    const homeGeohash =
      (u['home_geohash'] as string) ?? (u['homeGeohash'] as string) ?? null;
    const campusCommunityId =
      (u['campus_community_id'] as number) ??
      (u['campusCommunityId'] as number) ??
      null;

    return {
      id: Number(u['id'] ?? 0),
      username: (u['username'] as string) ?? null,
      phone:
        (u['phone'] as string) ??
        (u['phone_number'] as string) ??
        (u['phoneNumber'] as string) ??
        null,
      email: (u['email'] as string) ?? null,
      displayName: displayName !== '' ? displayName : 'RLS User',
      age:
        u['age'] != null
          ? Number(u['age'])
          : u['birth_year'] != null
            ? new Date().getFullYear() - Number(u['birth_year'])
            : null,
      gender: (u['gender'] as string) ?? null,
      avatarUrl: (u['avatar_url'] as string) ?? (u['avatarUrl'] as string) ?? null,
      campusCommunityId,
      homeGeohash,
      role: (u['role'] as string) ?? 'user',
      fcmToken: (u['fcm_token'] as string) ?? (u['fcmToken'] as string) ?? null,
      lastActiveAt:
        (u['last_active_at'] as string) ?? (u['lastActiveAt'] as string) ?? null,
      createdAt: (u['created_at'] as string) ?? (u['createdAt'] as string),
      updatedAt: (u['updated_at'] as string) ?? (u['updatedAt'] as string),
    };
  }
}
