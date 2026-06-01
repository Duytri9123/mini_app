import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { RlsAuthService } from '../../core/services/rls-auth.service';
import { RlsToastService } from '../../core/services/rls-toast.service';

/** Validator kiểm tra password_confirmation khớp password. */
const passwordMatchValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const pw = group.get('password')?.value;
  const confirm = group.get('password_confirmation')?.value;
  return pw && confirm && pw !== confirm ? { passwordMismatch: true } : null;
};

/**
 * RlsRegisterPage — trang đăng ký tài khoản mới (task 5.8, R1.1).
 *
 * Luồng:
 *  1. Submit form → `RlsAuthService.register()`.
 *  2. Thành công → redirect `/app-mini/home-map`.
 *  3. Lỗi 422 → hiển thị field errors từ backend (R1.3).
 *
 * _Requirements: 1.1, 1.3, 1.5_
 */
@Component({
  selector: 'rls-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './rls-register.page.html',
  styleUrls: ['./rls-register.page.scss'],
})
export class RlsRegisterPage implements OnInit {
  form!: FormGroup;
  loading = false;
  fieldErrors: Record<string, string[]> = {};
  generalError = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: RlsAuthService,
    private readonly toast: RlsToastService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        display_name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        username: [''],
        password: ['', [Validators.required, Validators.minLength(8)]],
        password_confirmation: ['', Validators.required],
      },
      { validators: passwordMatchValidator },
    );

    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/app-mini/home-map', { replaceUrl: true });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.fieldErrors = {};
    this.generalError = '';

    this.auth
      .register(this.form.value)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toast.success('Đăng ký thành công! Chào mừng bạn.');
          this.router.navigateByUrl('/app-mini/home-map', { replaceUrl: true });
        },
        error: (err) => {
          const status = err?.status ?? 0;
          if (status === 422 && err?.error?.errors) {
            this.fieldErrors = err.error.errors as Record<string, string[]>;
          } else {
            this.generalError =
              err?.error?.message ?? 'Đăng ký thất bại. Vui lòng thử lại.';
            this.toast.error(this.generalError);
          }
        },
      });
  }

  fieldError(name: string): string {
    return this.fieldErrors[name]?.[0] ?? '';
  }

  get nameCtrl() { return this.form.get('display_name'); }
  get emailCtrl() { return this.form.get('email'); }
  get passwordCtrl() { return this.form.get('password'); }
  get confirmCtrl() { return this.form.get('password_confirmation'); }
  get passwordMismatch() { return this.form.errors?.['passwordMismatch'] && this.confirmCtrl?.touched; }
}
