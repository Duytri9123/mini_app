import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GM_STORAGE_KEYS } from '../constants/gm-api.constants';
import { GmUser } from '../interfaces/user.interface';

export interface GmAuthResponse {
  access_token: string;
  refresh_token?: string;
  user: GmUser;
}

@Injectable({ providedIn: 'root' })
export class GmAuthService {
  readonly currentUser$ = new BehaviorSubject<GmUser | null>(this.loadUser());

  loginWithCredentials(data: { phoneOrEmail: string; password: string }): Observable<GmAuthResponse> {
    if (!data.phoneOrEmail || !data.password) {
      return throwError(() => new Error('Missing credentials'));
    }

    const response: GmAuthResponse = {
      access_token: 'demo-gapmove-token',
      refresh_token: 'demo-gapmove-refresh-token',
      user: {
        id: 'user-1',
        fullName: 'GapMove Customer',
        phone: data.phoneOrEmail.includes('@') ? null : data.phoneOrEmail,
        email: data.phoneOrEmail.includes('@') ? data.phoneOrEmail : null,
        avatarUrl: null,
        role: 'customer',
        status: 'active',
      },
    };

    return of(response).pipe(tap((res) => this.storeSession(res)));
  }

  register(data: { fullName: string; phone: string; email?: string; password: string }): Observable<GmAuthResponse> {
    return this.loginWithCredentials({ phoneOrEmail: data.email || data.phone, password: data.password });
  }

  logout(): Observable<void> {
    this.clearSession();
    return of(void 0);
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
}
