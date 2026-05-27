import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { GM_API_ENDPOINTS, GM_STORAGE_KEYS } from '../constants/gm-api.constants';
import { GmUser } from '../interfaces/user.interface';
import { GmApiService } from './gm-api.service';

export interface GmAuthResponse {
  message?: string;
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  user: GmUser;
}

interface ApiGmUser {
  id?: number | string;
  name?: string | null;
  full_name?: string | null;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  status?: string | null;
}

interface ApiAuthResponse {
  message?: string;
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  user: ApiGmUser;
}

@Injectable({ providedIn: 'root' })
export class GmAuthService {
  readonly currentUser$ = new BehaviorSubject<GmUser | null>(this.loadUser());

  constructor(private api: GmApiService) {}

  loginWithCredentials(data: { email: string; password: string }): Observable<GmAuthResponse> {
    return this.api
      .post<ApiAuthResponse>(GM_API_ENDPOINTS.auth.login, {
        email: data.email.trim(),
        password: data.password,
      })
      .pipe(
        map((response) => this.normalizeAuthResponse(response)),
        tap((response) => this.storeSession(response)),
      );
  }

  register(data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Observable<GmAuthResponse> {
    return this.api
      .post<ApiAuthResponse>(GM_API_ENDPOINTS.auth.register, {
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        password_confirmation: data.password_confirmation,
      })
      .pipe(
        map((response) => this.normalizeAuthResponse(response)),
        tap((response) => this.storeSession(response)),
      );
  }

  logout(): Observable<void> {
    if (!this.isAuthenticated()) {
      this.clearSession();
      return of(void 0);
    }

    return this.api.post<{ message: string }>(GM_API_ENDPOINTS.auth.logout, {}).pipe(
      catchError(() => of({ message: '' })),
      tap(() => this.clearSession()),
      map(() => void 0),
    );
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(GM_STORAGE_KEYS.accessToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(GM_STORAGE_KEYS.accessToken);
  }

  getCurrentUser(): GmUser | null {
    return this.currentUser$.getValue();
  }

  updateCurrentUser(user: GmUser): void {
    localStorage.setItem(GM_STORAGE_KEYS.user, JSON.stringify(user));
    this.currentUser$.next(user);
  }

  private storeSession(response: GmAuthResponse): void {
    localStorage.setItem(GM_STORAGE_KEYS.accessToken, response.access_token);
    if (response.refresh_token) {
      localStorage.setItem(GM_STORAGE_KEYS.refreshToken, response.refresh_token);
    } else {
      localStorage.removeItem(GM_STORAGE_KEYS.refreshToken);
    }
    this.updateCurrentUser(response.user);
  }

  private clearSession(): void {
    localStorage.removeItem(GM_STORAGE_KEYS.accessToken);
    localStorage.removeItem(GM_STORAGE_KEYS.refreshToken);
    localStorage.removeItem(GM_STORAGE_KEYS.user);
    this.currentUser$.next(null);
  }

  private loadUser(): GmUser | null {
    try {
      const raw = localStorage.getItem(GM_STORAGE_KEYS.user);
      return raw ? (JSON.parse(raw) as GmUser) : null;
    } catch {
      return null;
    }
  }

  private normalizeAuthResponse(response: ApiAuthResponse): GmAuthResponse {
    return {
      message: response.message,
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      token_type: response.token_type,
      user: this.normalizeUser(response.user),
    };
  }

  private normalizeUser(raw: ApiGmUser | null | undefined): GmUser {
    const fullName = String(raw?.name ?? raw?.full_name ?? raw?.fullName ?? '').trim();
    const status = raw?.status === 'blocked' || raw?.status === 'pending' ? raw.status : 'active';
    const role = raw?.role === 'driver' || raw?.role === 'dispatcher' || raw?.role === 'admin' ? raw.role : 'customer';

    return {
      id: String(raw?.id ?? ''),
      fullName: fullName || 'GapMove Customer',
      phone: raw?.phone ?? null,
      email: raw?.email ?? null,
      avatarUrl: raw?.avatar ?? raw?.avatar_url ?? raw?.avatarUrl ?? null,
      role,
      status,
    };
  }
}
