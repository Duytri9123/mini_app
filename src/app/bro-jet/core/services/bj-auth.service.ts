import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, shareReplay, finalize } from 'rxjs/operators';
import { BjApiService } from './bj-api.service';
import { BjUser } from '../interfaces/user.interface';

const BJ_ACCESS_TOKEN = 'bj_access_token';
const BJ_REFRESH_TOKEN = 'bj_refresh_token';
const BJ_USER_KEY = 'bj_user';

interface ApiBjUser {
  id?: string;
  phone?: string | null;
  email?: string | null;
  full_name?: string | null;
  fullName?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  status?: string;
  role?: string;
  google_id?: string | null;
  googleId?: string | null;
}

export interface AuthResponse {
  message: string;
  access_token: string;
  token_type: string;
  user: {
    id: number;
    full_name: string;
    email: string;
  };
}

@Injectable({ providedIn: 'root' })
export class BjAuthService {
  currentUser$ = new BehaviorSubject<BjUser | null>(this._loadUser());

  /** Timestamp of last successful syncCurrentUser call */
  private _lastSyncAt = 0;
  /** Cache TTL in milliseconds (60 seconds) */
  private readonly SYNC_TTL = 60_000;
  /** In-flight sync observable to deduplicate concurrent calls */
  private _syncInFlight$: Observable<BjUser> | null = null;

  constructor(private api: BjApiService) {}

  // ── New Email/Password Auth API ─────────────────────────────────────────

  /** Đăng ký tài khoản mới bằng email/password */
  register(data: {
    full_name: string;
    phone?: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Observable<AuthResponse> {
    return (this.api.post('auth/register', data) as Observable<AuthResponse>).pipe(
      tap((res) => this.storeSessionFromResponse(res))
    );
  }

  /** Đăng nhập bằng email/password hoặc phone/password */
  loginWithCredentials(data: { email: string; password: string }): Observable<AuthResponse> {
    return (this.api.post('auth/login', data) as Observable<AuthResponse>).pipe(
      tap((res) => this.storeSessionFromResponse(res))
    );
  }

  /** Lấy URL đăng nhập Google */
  getGoogleRedirectUrl(): Observable<{ url: string }> {
    return this.api.get('auth/google/redirect') as Observable<{ url: string }>;
  }

  /** Callback Google – gửi code lấy token */
  googleCallback(code: string): Observable<AuthResponse> {
    return (this.api.get(`auth/google/callback?code=${encodeURIComponent(code)}`) as Observable<AuthResponse>).pipe(
      tap((res) => this.storeSessionFromResponse(res))
    );
  }

  /** Gửi email reset mật khẩu */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.api.post('auth/forgot-password', { email }) as Observable<{ message: string }>;
  }

  /** Đặt lại mật khẩu */
  resetPassword(data: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Observable<{ message: string }> {
    return this.api.post('auth/reset-password', data) as Observable<{ message: string }>;
  }

  // ── Legacy OTP methods (kept for backward compatibility) ────────────────

  /** Đăng ký – gửi OTP đến số điện thoại */
  sendOtp(phone: string, fullName?: string): Observable<{ message: string; otp_token: string }> {
    return (this.api.post('auth/register', { phone, full_name: fullName }) as Observable<any>);
  }

  /** Xác thực OTP – trả về tokens và user */
  verifyOtp(otpToken: string, otpCode: string): Observable<{ access_token: string; refresh_token: string; user: BjUser }> {
    return (this.api.post('auth/verify-otp', { otp_token: otpToken, otp_code: otpCode }) as Observable<any>).pipe(
      tap((res: any) => this.storeSessionFromResponse(res))
    );
  }

  /** Đăng nhập – gửi OTP đến số điện thoại đã đăng ký */
  login(phone: string): Observable<{ message: string; otp_token: string }> {
    return (this.api.post('auth/login', { phone }) as Observable<any>);
  }

  /** Đăng xuất – vô hiệu hóa token hiện tại */
  logout(): Observable<{ message: string }> {
    return (this.api.post('auth/logout', {}) as Observable<any>).pipe(
      tap(() => this._clearSession())
    );
  }

  /** Làm mới access token */
  refreshToken(): Observable<{ access_token: string }> {
    const refreshToken = this.getRefreshToken();
    return (this.api.post('auth/refresh', { refresh_token: refreshToken }) as Observable<any>).pipe(
      tap((res: any) => localStorage.setItem(BJ_ACCESS_TOKEN, res.access_token))
    );
  }

  /**
   * Sync user from server with caching.
   * - Returns cached user if last sync was within TTL (60s).
   * - Deduplicates concurrent in-flight requests.
   * - Use force=true to bypass cache (e.g. after profile update).
   */
  syncCurrentUser(force = false): Observable<BjUser> {
    const now = Date.now();
    const cached = this.currentUser$.getValue();

    // Prevent redundant calls during app initialization/page reload
    // If force=true but we just synced < 2s ago, don't actually force
    const justSynced = (now - this._lastSyncAt) < 2000;
    if (force && justSynced && cached) {
      force = false;
    }

    // Return cached if within TTL and not forced
    if (!force && cached && (now - this._lastSyncAt) < this.SYNC_TTL) {
      return of(cached);
    }

    // Deduplicate concurrent calls
    if (this._syncInFlight$) {
      return this._syncInFlight$;
    }

    this._syncInFlight$ = (this.api.get('auth/me') as Observable<any>).pipe(
      map((res: any) => this._normalizeUser(res?.user ?? res)),
      tap((user: BjUser) => {
        this._setUserState(user);
        this._lastSyncAt = Date.now();
      }),
      shareReplay(1),
      finalize(() => {
        this._syncInFlight$ = null;
      }),
    );

    return this._syncInFlight$;
  }

  storeSessionFromResponse(response: any): void {
    if (!response?.access_token) {
      return;
    }

    this._saveTokens(response.access_token, response.refresh_token ?? null);

    if (response.user) {
      this._setUserState(this._normalizeUser(response.user));
    }
  }

  updateCurrentUser(user: any): BjUser {
    const normalized = this._normalizeUser(user);
    this._setUserState(normalized);
    return normalized;
  }

  getCurrentUser(): BjUser | null {
    return this.currentUser$.getValue();
  }

  isAuthenticated(): boolean {
    return !!(localStorage.getItem(BJ_ACCESS_TOKEN) || localStorage.getItem('token') || localStorage.getItem('auth_token'));
  }

  getAccessToken(): string | null {
    return localStorage.getItem(BJ_ACCESS_TOKEN) || localStorage.getItem('token') || localStorage.getItem('auth_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(BJ_REFRESH_TOKEN);
  }

  private _saveTokens(accessToken: string, refreshToken?: string | null): void {
    localStorage.setItem(BJ_ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      localStorage.setItem(BJ_REFRESH_TOKEN, refreshToken);
    } else {
      localStorage.removeItem(BJ_REFRESH_TOKEN);
    }
  }

  private _saveUser(user: BjUser): void {
    localStorage.setItem(BJ_USER_KEY, JSON.stringify(user));
  }

  private _setUserState(user: BjUser | null): void {
    if (user) {
      this._saveUser(user);
    }
    this.currentUser$.next(user);
  }

  private _loadUser(): BjUser | null {
    try {
      const raw = localStorage.getItem(BJ_USER_KEY);
      if (!raw) return null;
      return this._normalizeUser(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  private _normalizeUser(raw: ApiBjUser | null | undefined): BjUser {
    const fullName = (raw?.full_name ?? raw?.fullName ?? (raw as any)?.name ?? '').trim();
    const googleId = raw?.google_id ?? raw?.googleId ?? null;

    return {
      id: String(raw?.id ?? ''),
      phone: raw?.phone ?? null,
      email: raw?.email ?? null,
      fullName: fullName !== '' ? fullName : 'Brojet User',
      avatarUrl: raw?.avatar_url ?? raw?.avatarUrl ?? null,
      status: raw?.status ?? 'active',
      role: raw?.role ?? 'customer',
      googleId,
      googleLinked: !!googleId,
    };
  }

  private _clearSession(): void {
    localStorage.removeItem(BJ_ACCESS_TOKEN);
    localStorage.removeItem(BJ_REFRESH_TOKEN);
    localStorage.removeItem(BJ_USER_KEY);
    this._lastSyncAt = 0;
    this._syncInFlight$ = null;
    this.currentUser$.next(null);
  }
}
