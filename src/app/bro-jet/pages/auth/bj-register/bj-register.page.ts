import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BjAuthService } from '../../../core/services/bj-auth.service';
import { BjGoogleAuthService } from '../../../core/services/bj-google-auth.service';
import { BjToastService } from '../../../core/services/bj-toast.service';
import { BJ_ICONS } from '../../../shared/icons/bj-icons';
import { SafeSvgPipe } from '../../../shared/pipes/safe-svg.pipe';

/** Custom validator: password confirmation must match password */
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('password_confirmation');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'bj-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SafeSvgPipe],
  templateUrl: './bj-register.page.html',
  styleUrls: ['../../../shared/styles/bj-auth.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BjRegisterPage implements OnInit, OnDestroy {
  readonly icons = BJ_ICONS;
  registerForm!: FormGroup;
  loading = false;
  isGoogleLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: BjAuthService,
    private googleAuth: BjGoogleAuthService,
    private router: Router,
    private toast: BjToastService,
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^0\d{9}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]],
    }, { validators: passwordMatchValidator });

    this.googleAuth.init();
  }

  ngOnDestroy(): void {}

  // ── Email/Password Register ───────────────────────────────────────────────

  submitRegister(): void {
    if (this.loading) return;

    // Mark all fields as touched to show errors
    this.registerForm.markAllAsTouched();

    const { full_name, phone, email, password, password_confirmation, terms } = this.registerForm.value;

    // Custom validation messages
    if (!full_name || full_name.trim().length < 2) {
      this.toast.error('Vui lòng nhập họ tên (ít nhất 2 ký tự).');
      return;
    }

    const cleanPhone = this._normalizePhone(phone || '');
    const phoneRegex = /^(0[3|5|7|8|9])\d{8}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      this.toast.error('Số điện thoại không hợp lệ (VD: 0971424792).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      this.toast.error('Vui lòng nhập email hợp lệ.');
      return;
    }

    if (!password || password.length < 8) {
      this.toast.error('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    if (password !== password_confirmation) {
      this.toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (!terms) {
      this.toast.error('Bạn cần đồng ý với Điều khoản & Chính sách.');
      return;
    }

    this.loading = true;

    this.authService.register({ full_name: full_name.trim(), phone: cleanPhone, email: email.trim(), password, password_confirmation }).subscribe({
      next: () => {
        this.loading = false;
        this.toast.success('Đăng ký thành công!');
        this.router.navigate(['/bro-jet/welcome']);
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(this._extractError(err, 'Đăng ký thất bại. Vui lòng thử lại.'));
      },
    });
  }

  // ── Google Register ───────────────────────────────────────────────────────

  registerWithGoogle(): void {
    if (this.loading || this.isGoogleLoading) return;
    this.isGoogleLoading = true;

    this.googleAuth.signIn().then((res) => {
      this.authService.storeSessionFromResponse(res);
      this.router.navigate(['/bro-jet/welcome']);
    }).catch((err) => {
      this.toast.error(typeof err === 'string' ? err : 'Đăng ký Google thất bại.');
    }).finally(() => {
      this.isGoogleLoading = false;
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _extractError(err: any, fallback: string): string {
    if (err?.error?.errors) {
      const firstField = Object.values(err.error.errors)[0] as any;
      if (Array.isArray(firstField) && firstField.length > 0) {
        return String(firstField[0]);
      }
    }
    return err?.error?.message || err?.error?.error || fallback;
  }

  private _normalizePhone(phone: string): string {
    let normalized = phone.trim().replace(/\s+/g, '');
    if (normalized.startsWith('+840')) {
      normalized = '0' + normalized.substring(4);
    } else if (normalized.startsWith('840')) {
      normalized = '0' + normalized.substring(3);
    } else if (normalized.startsWith('+84')) {
      normalized = '0' + normalized.substring(3);
    } else if (normalized.startsWith('84') && normalized.length >= 11) {
      normalized = '0' + normalized.substring(2);
    }
    return normalized;
  }
}
