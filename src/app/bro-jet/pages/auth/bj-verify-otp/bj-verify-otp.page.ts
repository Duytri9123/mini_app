import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL, environment } from 'src/environments/environment';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { BjAuthService } from '../../../core/services/bj-auth.service';
import { BjToastService } from '../../../core/services/bj-toast.service';
import { BJ_ICONS } from '../../../shared/icons/bj-icons';
import { SafeSvgPipe } from '../../../shared/pipes/safe-svg.pipe';

@Component({
  selector: 'bj-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SafeSvgPipe],
  templateUrl: './bj-verify-otp.page.html',
  styleUrls: ['../../../shared/styles/bj-auth.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BjVerifyOtpPage implements OnInit, OnDestroy {
  readonly icons = BJ_ICONS;

  phone = '';
  otpCode = '';
  otpError = '';
  loading = false;
  countdown = 60;

  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private recaptchaVerifier: firebase.auth.RecaptchaVerifier | null = null;
  private confirmationResult: firebase.auth.ConfirmationResult | null = null;

  get countdownDisplay(): string {
    const m = Math.floor(this.countdown / 60).toString().padStart(2, '0');
    const s = (this.countdown % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get canResend(): boolean {
    return this.countdown === 0 && !this.loading;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private afAuth: AngularFireAuth,
    private authService: BjAuthService,
    private toast: BjToastService,
  ) {}

  ngOnInit(): void {
    // Get phone from query params (passed from register or login)
    this.phone = this.route.snapshot.queryParamMap.get('phone') || '';

    if (!this.phone) {
      this.router.navigate(['/bro-jet/login']);
      return;
    }

    // Auto-send OTP on page load
    this.sendOtp();
  }

  ngOnDestroy(): void {
    this._clearCountdown();
    this._clearRecaptcha();
  }

  onOtpInput(): void {
    this.otpError = '';
  }

  async verifyOtp(): Promise<void> {
    if (this.loading) return;

    this.otpCode = this.otpCode.trim();
    this.otpError = '';

    if (!this.confirmationResult) {
      this.toast.error('Vui lòng gửi mã OTP trước.');
      return;
    }

    if (!/^\d{6}$/.test(this.otpCode)) {
      this.otpError = 'Mã OTP phải gồm đúng 6 chữ số.';
      return;
    }

    this.loading = true;
    try {
      const credential = await this.confirmationResult.confirm(this.otpCode);
      const idToken = await credential.user?.getIdToken(true);

      if (!idToken) {
        throw new Error('missing-id-token');
      }

      const res: any = await firstValueFrom(
        this.http.post(`${API_URL}/login/firebase-phone`, { id_token: idToken }),
      );

      this.authService.storeSessionFromResponse(res);

      if (this._requiresProfileSetup(res)) {
        this.router.navigate(['/bro-jet/setup-profile']);
      } else {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/bro-jet/home';
        this.router.navigateByUrl(returnUrl, { replaceUrl: true });
      }
    } catch (err: any) {
      this.toast.error(err?.error?.message || this._firebaseErrorMessage(err));
    } finally {
      this.loading = false;
    }
  }

  async resendOtp(): Promise<void> {
    if (!this.canResend) return;
    this._clearRecaptcha();
    await this.sendOtp();
  }

  goBack(): void {
    window.history.back();
  }

  async sendOtp(): Promise<void> {
    if (!this._hasFirebaseConfig()) {
      this.toast.error('Thiếu cấu hình Firebase.');
      return;
    }

    const e164Phone = this._toE164(this.phone);
    if (!e164Phone) {
      this.toast.error('Số điện thoại không hợp lệ.');
      return;
    }

    this.loading = true;
    try {
      await this._ensureRecaptcha();

      this.confirmationResult = await this.afAuth.signInWithPhoneNumber(
        e164Phone,
        this.recaptchaVerifier as firebase.auth.ApplicationVerifier,
      );

      this.otpCode = '';
      this._startCountdown(60);
    } catch (err: any) {
      this.toast.error(this._firebaseErrorMessage(err));
      this._clearRecaptcha();
    } finally {
      this.loading = false;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _requiresProfileSetup(res: any): boolean {
    if (res?.is_new_user) return true;
    const user = res?.user ?? {};
    const fullName = String(user?.full_name ?? user?.fullName ?? '').trim();
    const email = String(user?.email ?? '').trim().toLowerCase();
    return fullName === '' || fullName.toLowerCase() === 'brojet user' || email === '' || email.endsWith('@firebase-user.local');
  }

  private _toE164(phone: string): string | null {
    const digits = (phone || '').replace(/\D/g, '');
    if (/^0\d{9}$/.test(digits)) return `+84${digits.slice(1)}`;
    if (/^84\d{9}$/.test(digits)) return `+${digits}`;
    if (/^\d{9}$/.test(digits)) return `+84${digits}`;
    return null;
  }

  private _hasFirebaseConfig(): boolean {
    const cfg: any = environment.firebase || {};
    return !!(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
  }

  private async _ensureRecaptcha(): Promise<void> {
    if (this.recaptchaVerifier) return;
    const container = document.getElementById('bj-recaptcha-container');
    if (!container) throw new Error('missing-recaptcha-container');
    this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('bj-recaptcha-container', { size: 'invisible' });
    await this.recaptchaVerifier.render();
  }

  private _clearRecaptcha(): void {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
      this.recaptchaVerifier = null;
    }
    const container = document.getElementById('bj-recaptcha-container');
    if (container) container.innerHTML = '';
  }

  private _startCountdown(seconds: number): void {
    this._clearCountdown();
    this.countdown = seconds;
    this.countdownInterval = setInterval(() => {
      if (this.countdown > 0) this.countdown--;
      else this._clearCountdown();
    }, 1000);
  }

  private _clearCountdown(): void {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private _firebaseErrorMessage(err: any): string {
    const code = (err?.code || '').toString().toLowerCase();
    if (code.includes('invalid-phone-number')) return 'Số điện thoại không hợp lệ.';
    if (code.includes('too-many-requests')) return 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';
    if (code.includes('code-expired')) return 'Mã OTP đã hết hạn. Vui lòng gửi lại.';
    if (code.includes('invalid-verification-code')) return 'Mã OTP không đúng.';
    if (code.includes('session-expired')) return 'Phiên đã hết hạn. Vui lòng gửi lại OTP.';
    if (code.includes('captcha-check-failed')) return 'Xác minh reCAPTCHA thất bại.';
    if (code.includes('operation-not-allowed')) return 'Phone Auth chưa được bật.';
    return 'Không thể xác thực. Vui lòng thử lại.';
  }
}
