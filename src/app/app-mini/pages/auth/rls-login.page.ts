import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { RlsAuthService } from '../../core/services/rls-auth.service';
import { RlsToastService } from '../../core/services/rls-toast.service';

type RlsOtpStep = 'phone' | 'otp' | 'profile';

@Component({
  selector: 'rls-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './rls-login.page.html',
  styleUrls: ['./rls-login.page.scss'],
})
export class RlsLoginPage implements OnInit {
  phoneForm!: FormGroup;
  otpForm!: FormGroup;
  profileForm!: FormGroup;

  step: RlsOtpStep = 'phone';
  loading = false;
  fieldErrors: Record<string, string[]> = {};
  generalError = '';
  pendingPhone = '';
  pendingOtp = '';
  onboardingToken: string | null = null;

  private returnUrl = '/app-mini/home-map';

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: RlsAuthService,
    private readonly toast: RlsToastService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.phoneForm = this.fb.group({
      phone: ['', [Validators.required, Validators.pattern(/^(0|\+84)[0-9]{9,10}$/)]],
    });
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^[0-9]{4,6}$/)]],
    });
    this.profileForm = this.fb.group({
      age: [18, [Validators.required, Validators.min(13), Validators.max(100)]],
      gender: ['', Validators.required],
    });

    this.returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl') ??
      '/app-mini/home-map';

    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
    }
  }

  requestOtp(): void {
    if (this.phoneForm.invalid || this.loading) {
      this.phoneForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.clearErrors();
    this.pendingPhone = this.normalizePhone(this.phoneCtrl?.value);

    this.auth
      .requestPhoneOtp({ phone: this.pendingPhone })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.step = 'otp';
          this.toast.success('Mã OTP đã được gửi tới số điện thoại của bạn.');
        },
        error: (err) => this.handleError(err, 'Không thể gửi OTP. Vui lòng thử lại.'),
      });
  }

  verifyOtp(): void {
    if (this.otpForm.invalid || this.loading) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.clearErrors();
    this.pendingOtp = String(this.otpCtrl?.value ?? '').trim();

    this.auth
      .verifyPhoneOtp({ phone: this.pendingPhone, otp: this.pendingOtp })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.onboardingToken = result.onboardingToken;
          if (result.requiresProfile) {
            this.step = 'profile';
            return;
          }
          this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
        },
        error: (err) => this.handleError(err, 'OTP không đúng hoặc đã hết hạn.'),
      });
  }

  completeProfile(): void {
    if (this.profileForm.invalid || this.loading) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.clearErrors();
    const { age, gender } = this.profileForm.value;

    this.auth
      .completePhoneProfile({
        phone: this.pendingPhone,
        otp: this.pendingOtp,
        onboarding_token: this.onboardingToken,
        age: Number(age),
        gender,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toast.success('Hồ sơ đã sẵn sàng.');
          this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
        },
        error: (err) => this.handleError(err, 'Không thể hoàn thiện hồ sơ.'),
      });
  }

  backToPhone(): void {
    if (this.loading) {
      return;
    }
    this.step = 'phone';
    this.otpForm.reset();
    this.profileForm.patchValue({ age: 18, gender: '' });
    this.clearErrors();
  }

  resendOtp(): void {
    if (this.loading) {
      return;
    }
    this.requestOtp();
  }

  fieldError(name: string): string {
    return this.fieldErrors[name]?.[0] ?? '';
  }

  get phoneCtrl() {
    return this.phoneForm.get('phone');
  }

  get otpCtrl() {
    return this.otpForm.get('otp');
  }

  get ageCtrl() {
    return this.profileForm.get('age');
  }

  get genderCtrl() {
    return this.profileForm.get('gender');
  }

  private normalizePhone(value: unknown): string {
    const raw = String(value ?? '').replace(/[\s.-]/g, '');
    if (raw.startsWith('0')) {
      return `+84${raw.slice(1)}`;
    }
    return raw;
  }

  private clearErrors(): void {
    this.fieldErrors = {};
    this.generalError = '';
  }

  private handleError(err: unknown, fallback: string): void {
    const e = err as { status?: number; error?: { errors?: Record<string, string[]>; message?: string } };
    if (e?.status === 422 && e.error?.errors) {
      this.fieldErrors = e.error.errors;
      return;
    }
    this.generalError = e?.error?.message ?? fallback;
    this.toast.error(this.generalError);
  }
}
