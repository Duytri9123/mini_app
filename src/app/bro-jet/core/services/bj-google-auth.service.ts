import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subject } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { API_URL, environment } from 'src/environments/environment';

declare const google: any;

export interface GoogleAuthResult {
  success: boolean;
  response?: any;
  error?: string;
}

/**
 * Singleton service that manages Google Sign-In.
 * - Web: uses Google Identity Services SDK
 * - Native (Android/iOS): uses @capgo/capacitor-social-login
 */
@Injectable({ providedIn: 'root' })
export class BjGoogleAuthService {
  /** Emits the raw API response after a successful Google sign-in */
  private _result$ = new Subject<GoogleAuthResult>();
  readonly result$ = this._result$.asObservable();

  private _initialized = false;
  private _ready = false;
  private _retryCount = 0;
  private _buttonEl: HTMLElement | null = null;
  private _containerId = 'bjGoogleButtonShared';

  constructor(private http: HttpClient) {}

  /**
   * Call once from the page that is currently active.
   * Safe to call multiple times — re-uses the existing SDK instance.
   */
  init(): void {
    if (Capacitor.getPlatform() === 'web') {
      this._loadScript()
        .then(() => this._initSdk())
        .catch(() => {});
    }
    // Native doesn't need explicit init — SocialLogin handles it
  }

  /**
   * Trigger the Google sign-in.
   * Returns a promise that resolves with the API response on success,
   * or rejects with an error message.
   */
  async signIn(): Promise<any> {
    if (Capacitor.getPlatform() === 'web') {
      return this._signInWeb();
    } else {
      return this._signInNative();
    }
  }

  // ── Native Sign-In ────────────────────────────────────────────────────────

  private async _signInNative(): Promise<any> {
    try {
      const response = await SocialLogin.login({
        provider: 'google',
        options: {
          prompt: 'select_account',
        },
      });

      const result = response.result;

      if ('idToken' in result && result.idToken) {
        return this._sendTokenToBackend(result.idToken);
      } else {
        throw new Error('Không nhận được Google token.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Đăng nhập Google thất bại.';
      throw msg;
    }
  }

  // ── Web Sign-In ───────────────────────────────────────────────────────────

  private _signInWeb(): Promise<any> {
    if (!this._ready || !this._buttonEl) {
      this._initSdk();
      return Promise.reject('Google Sign-In đang khởi tạo. Vui lòng thử lại sau 1-2 giây.');
    }

    return new Promise((resolve, reject) => {
      const sub = this._result$.subscribe((result) => {
        sub.unsubscribe();
        if (result.success) {
          resolve(result.response);
        } else {
          reject(result.error ?? 'Đăng nhập Google thất bại.');
        }
      });

      this._buttonEl!.click();
    });
  }

  // ── Shared: send token to backend ─────────────────────────────────────────

  private async _sendTokenToBackend(token: string): Promise<any> {
    try {
      const res = await firstValueFrom(
        this.http.post(`${API_URL}/login/google`, { token }),
      );
      return res;
    } catch (err: any) {
      const msg = err?.error?.message || err?.error?.error || 'Đăng nhập Google thất bại.';
      throw msg;
    }
  }

  // ── Web SDK helpers ───────────────────────────────────────────────────────

  private async _loadScript(): Promise<void> {
    if (document.getElementById('google-gsi-script')) return;

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google script load failed'));
      document.head.appendChild(script);
    });
  }

  private _initSdk(): void {
    if (Capacitor.getPlatform() !== 'web') return;

    const clientId = environment.GOOGLE_CLIENT_ID || '';
    if (!clientId) return;

    // Ensure shared hidden container exists in DOM
    let container = document.getElementById(this._containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this._containerId;
      container.setAttribute('aria-hidden', 'true');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.body.appendChild(container);
    }

    if (!this._initialized) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => this._handleCredential(response),
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });
      this._initialized = true;
    }

    if (!container.firstElementChild) {
      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 220,
      });
    }

    setTimeout(() => {
      this._buttonEl = container!.querySelector('div[role="button"]') as HTMLElement;
      this._ready = !!this._buttonEl;
      if (!this._ready) this._scheduleRetry();
      else this._retryCount = 0;
    }, 400);
  }

  private _scheduleRetry(): void {
    if (this._ready || this._retryCount >= 8) return;
    this._retryCount += 1;
    setTimeout(() => this._initSdk(), 250);
  }

  private async _handleCredential(response: any): Promise<void> {
    if (!response?.credential) {
      this._result$.next({ success: false, error: 'Không nhận được Google token.' });
      return;
    }

    try {
      const res = await this._sendTokenToBackend(response.credential);
      this._result$.next({ success: true, response: res });
    } catch (err: any) {
      this._result$.next({ success: false, error: typeof err === 'string' ? err : 'Đăng nhập Google thất bại.' });
    }
  }
}
