import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { API_URL, environment } from 'src/environments/environment';
import { BjAuthService } from '../../../core/services/bj-auth.service';
import { BjGoogleAuthService } from '../../../core/services/bj-google-auth.service';
import { BjToastService } from '../../../core/services/bj-toast.service';
import { BJ_ICONS } from '../../../shared/icons/bj-icons';
import { SafeSvgPipe } from '../../../shared/pipes/safe-svg.pipe';

@Component({
  selector: 'bj-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SafeSvgPipe],
  templateUrl: './bj-login.template.html',
  styleUrls: ['../../../shared/styles/bj-auth.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BjLoginPage implements OnInit, OnDestroy {
  readonly icons = BJ_ICONS;

  // UI state
  step: 'phone' | 'password' | 'otp' = 'phone';
  loading = false;
  isGoogleLoading = false;
  phoneError = '';
  passwordError = '';
  otpError = '';
  showPassword = false;

  // Form data
  phone = '';
  password = '';
  otpCode = '';

  // OTP countdown
  countdown = 0;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  // Firebase
  private recaptchaVerifier: firebase.auth.RecaptchaVerifier | null = null;
  private confirmationResult: firebase.auth.ConfirmationResult | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private afAuth: AngularFireAuth,
    private authService: BjAuthService,
    private googleAuth: BjGoogleAuthService,
    private toast: BjToastService,
  ) {}

  ngOnInit(): void {
    this.googleAuth.init();
  }

  ngOnDestroy(): void {
    this._clearCountdown();
    this._clearRecaptcha();
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  get countdownDisplay(): string {
    const m = Math.floor(this.countdown / 60).toString().padStart(2, '0');
    const s = (this.countdown % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get canResendOtp(): boolean {
    return this.step === 'otp' && this.countdown === 0 && !this.loading;
  }

  // ── Input handlers ────────────────────────────────────────────────────────

  onPhoneInput(): void {
    this.phone = this._normalizePhoneInput(this.phone);
    this.phoneError = '';
  }

  onOtpInput(): void {
    this.otpError = '';
  }

  // ── Step 1: Continue with phone ───────────────────────────────────────────

  async continueWithPhone(): Promise<void> {
    if (this.loading) return;

    this.phone = this._normalizePhoneInput(this.phone).trim();
    this.phoneError = '';

    if (!/^0\d{9}$/.test(this.phone)) {
      this.phoneError = 'Số điện thoại không hợp lệ (ví dụ: 0971424792).';
      return;
    }

    this.loading = true;
    try {
      const options: any = await firstValueFrom(
        this.http.post(`${API_URL}/login/options`, { phone: this.phone }),
      );

      if (options?.exists && options?.has_password) {
        this.step = 'password';
        this.password = '';
      } else {
        await this._sendOtp();
      }
    } catch (err: any) {
      this.toast.error(this._extractApiError(err, 'Không thể kiểm tra tài khoản.'));
    } finally {
      this.loading = false;
    }
  }

  // ── Step 2a: Login with password ──────────────────────────────────────────

  async loginWithPassword(): Promise<void> {
    if (this.loading) return;

    this.passwordError = '';
    const pw = this.password.trim();

    if (pw.length < 6) {
      this.passwordError = 'Vui lòng nhập mật khẩu hợp lệ (ít nhất 6 ký tự).';
      return;
    }

    this.loading = true;
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_URL}/login/phone-password`, {
          phone: this.phone,
          password: pw,
        }),
      );
      this.authService.storeSessionFromResponse(res);
      this._navigateAfterLogin(res);
    } catch (err: any) {
      this.toast.error(this._extractApiError(err, 'Đăng nhập thất bại.'));
    } finally {
      this.loading = false;
    }
  }

  // ── Step 2b: Verify OTP ───────────────────────────────────────────────────

  async verifyOtp(): Promise<void> {
    if (this.loading) return;

    this.otpError = '';
    this.otpCode = this.otpCode.trim();

    if (!/^\d{6}$/.test(this.otpCode)) {
      this.otpError = 'Mã OTP phải gồm đúng 6 chữ số.';
      return;
    }

    if (!this.confirmationResult) {
      this.toast.error('Vui lòng gửi mã OTP trước.');
      return;
    }

    this.loading = true;
    try {
      const credential = await this.confirmationResult.confirm(this.otpCode);
      const idToken = await credential.user?.getIdToken(true);
      if (!idToken) throw new Error('missing-id-token');

      const res: any = await firstValueFrom(
        this.http.post(`${API_URL}/login/firebase-phone`, { id_token: idToken }),
      );
      this.authService.storeSessionFromResponse(res);
      this._navigateAfterLogin(res);
    } catch (err: any) {
      this.toast.error(err?.error?.message || this._firebaseError(err, true));
    } finally {
      this.loading = false;
    }
  }

  // ── OTP helpers ───────────────────────────────────────────────────────────

  useOtpInstead(): void {
    this.step = 'phone';
    this.password = '';
    this.passwordError = '';
    this._sendOtpFromPasswordStep();
  }

  async resendOtp(): Promise<void> {
    if (!this.canResendOtp) return;
    this._clearRecaptcha();
    this.loading = true;
    try {
      await this._sendOtp();
    } finally {
      this.loading = false;
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  goBackToPhone(): void {
    if (this.loading) return;
    this.step = 'phone';
    this.password = '';
    this.otpCode = '';
    this.passwordError = '';
    this.otpError = '';
    this.confirmationResult = null;
    this._clearCountdown();
    this._clearRecaptcha();
  }

  // ── Google Login ──────────────────────────────────────────────────────────

  loginWithGoogle(): void {
    if (this.loading || this.isGoogleLoading) return;
    this.isGoogleLoading = true;

    this.googleAuth.signIn().then((res) => {
      this.authService.storeSessionFromResponse(res);
      this._navigateAfterLogin(res);
    }).catch((err) => {
      this.toast.error(typeof err === 'string' ? err : 'Đăng nhập Google thất bại.');
    }).finally(() => {
      this.isGoogleLoading = false;
    });
  }

  // ── Private: OTP ──────────────────────────────────────────────────────────

  private async _sendOtpFromPasswordStep(): Promise<void> {
    this.loading = true;
    try {
      await this._sendOtp();
    } finally {
      this.loading = false;
    }
  }

  private async _sendOtp(): Promise<void> {
    if (!this._hasFirebaseConfig()) {
      this.toast.error('Thiếu cấu hình Firebase.');
      return;
    }

    const e164 = this._toE164(this.phone);
    if (!e164) {
      this.phoneError = 'Số điện thoại không hợp lệ.';
      return;
    }

    try {
      await this._ensureRecaptcha();
      this.confirmationResult = await this.afAuth.signInWithPhoneNumber(
        e164,
        this.recaptchaVerifier as firebase.auth.ApplicationVerifier,
      );
      this.step = 'otp';
      this.otpCode = '';
      this._startCountdown(60);
    } catch (err: any) {
      this.toast.error(this._firebaseError(err, false));
      this._clearRecaptcha();
    }
  }

  private async _ensureRecaptcha(): Promise<void> {
    if (this.recaptchaVerifier) return;

    const container = document.getElementById('firebase-recaptcha-container');
    if (!container) throw new Error('missing-recaptcha-container');

    this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
      'firebase-recaptcha-container',
      { size: 'invisible' },
    );
    await this.recaptchaVerifier.render();
  }

  private _clearRecaptcha(): void {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
      this.recaptchaVerifier = null;
    }
    const container = document.getElementById('firebase-recaptcha-container');
    if (container) container.innerHTML = '';
  }

  // ── Private: Countdown ────────────────────────────────────────────────────

  private _startCountdown(seconds: number): void {
    this._clearCountdown();
    this.countdown = seconds;
    this.countdownInterval = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown -= 1;
      } else {
        this._clearCountdown();
      }
    }, 1000);
  }

  private _clearCountdown(): void {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  // ── Private: Helpers ──────────────────────────────────────────────────────

  private _navigateAfterLogin(res?: any): void {
    if (this._requiresProfileSetup(res)) {
      this.router.navigate(['/bro-jet/setup-profile']);
    } else {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/bro-jet/home';
      this.router.navigateByUrl(returnUrl, { replaceUrl: true });
    }
  }

  private _requiresProfileSetup(res: any): boolean {
    if (!res) return false;
    if (res?.is_new_user) return true;
    const user = res?.user ?? {};
    const fullName = String(user?.full_name ?? user?.fullName ?? '').trim();
    const email = String(user?.email ?? '').trim().toLowerCase();
    const isNameMissing = fullName === '' || fullName.toLowerCase() === 'brojet user';
    const isEmailMissing = email === '' || email.endsWith('@firebase-user.local');
    return isNameMissing || isEmailMissing;
  }

  private _normalizePhoneInput(raw: string): string {
    const normalized = (raw || '').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    const digits = normalized.replace(/\D/g, '');
    if (digits.startsWith('84') && digits.length >= 11) return `0${digits.slice(2, 11)}`;
    if (digits.startsWith('0')) return digits.slice(0, 10);
    if (digits.length <= 9) return digits;
    return digits.slice(0, 10);
  }

  private _toE164(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (/^0\d{9}$/.test(digits)) return `+84${digits.slice(1)}`;
    if (/^84\d{9}$/.test(digits)) return `+${digits}`;
    if (/^\d{9}$/.test(digits)) return `+84${digits}`;
    return null;
  }

  private _hasFirebaseConfig(): boolean {
    const fc: any = environment.firebase || {};
    return !!(fc.apiKey && fc.authDomain && fc.projectId && fc.appId);
  }

  private _extractApiError(err: any, fallback: string): string {
    if (err?.error?.errors) {
      const first = Object.values(err.error.errors)[0] as any;
      if (Array.isArray(first) && first.length > 0) return String(first[0]);
    }
    return err?.error?.message || err?.error?.error || fallback;
  }

  private _firebaseError(err: any, isVerify: boolean): string {
    const code = (err?.code || '').toString();
    if (code.includes('configuration-not-found') || code.includes('configuration_not_found'))
      return 'Firebase Phone Auth chưa được cấu hình.';
    if (code.includes('billing-not-enabled') || code.includes('billing_not_enabled'))
      return 'Firebase yêu cầu Blaze plan để gửi OTP.';
    if (code.includes('operation-not-allowed'))
      return 'Phone Auth chưa được bật trong Firebase Console.';
    if (code.includes('invalid-phone-number'))
      return 'Số điện thoại không hợp lệ.';
    if (code.includes('too-many-requests'))
      return 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';
    if (code.includes('code-expired'))
      return 'Mã OTP đã hết hạn. Vui lòng gửi lại.';
    if (code.includes('invalid-verification-code'))
      return 'Mã OTP không đúng.';
    if (code.includes('session-expired'))
      return 'Phiên xác minh hết hạn. Vui lòng gửi lại OTP.';
    return isVerify ? 'Xác thực OTP thất bại.' : 'Không thể gửi OTP. Vui lòng thử lại.';
  }
}
