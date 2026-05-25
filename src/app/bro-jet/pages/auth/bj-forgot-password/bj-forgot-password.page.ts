import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { BjAuthService } from '../../../core/services/bj-auth.service';
import { BjToastService } from '../../../core/services/bj-toast.service';
import { BJ_ICONS } from '../../../shared/icons/bj-icons';
import { SafeSvgPipe } from '../../../shared/pipes/safe-svg.pipe';

@Component({
  selector: 'bj-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SafeSvgPipe],
  templateUrl: './bj-forgot-password.page.html',
  styleUrls: ['../../../shared/styles/bj-auth.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BjForgotPasswordPage implements OnInit {
  readonly icons = BJ_ICONS;
  /** Step 1: enter email, Step 2: enter token + new password */
  step: 1 | 2 = 1;

  emailForm!: FormGroup;
  resetForm!: FormGroup;

  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: BjAuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: BjToastService,
  ) {}

  ngOnInit(): void {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.resetForm = this.fb.group({
      token: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]],
    });

    // Check if token is in URL (from email link)
    const token = this.route.snapshot.queryParamMap.get('token');
    const email = this.route.snapshot.queryParamMap.get('email');
    if (token) {
      this.step = 2;
      this.resetForm.patchValue({ token, email: email || '' });
    }
  }

  submitForgotPassword(): void {
    if (this.emailForm.invalid || this.loading) return;
    this.loading = true;

    const { email } = this.emailForm.value;

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.loading = false;
        const msg = res.message || 'Đã gửi link đặt lại mật khẩu đến email của bạn.';
        this.toast.success(msg);
        // Pre-fill email in reset form
        this.resetForm.patchValue({ email });
        this.step = 2;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(this._extractError(err, 'Không thể gửi email. Vui lòng thử lại.'));
      },
    });
  }

  submitResetPassword(): void {
    if (this.resetForm.invalid || this.loading) return;
    this.loading = true;

    const { token, email, password, password_confirmation } = this.resetForm.value;

    this.authService.resetPassword({ token, email, password, password_confirmation }).subscribe({
      next: (res) => {
        this.loading = false;
        const msg = res.message || 'Mật khẩu đã được đặt lại thành công.';
        this.toast.success(msg);
        // Redirect to login after 2 seconds
        setTimeout(() => this.router.navigate(['/bro-jet/login']), 2000);
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(this._extractError(err, 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.'));
      },
    });
  }

  goBackToEmail(): void {
    this.step = 1;
  }

  private _extractError(err: any, fallback: string): string {
    if (err?.error?.errors) {
      const firstField = Object.values(err.error.errors)[0] as any;
      if (Array.isArray(firstField) && firstField.length > 0) {
        return String(firstField[0]);
      }
    }
    return err?.error?.message || err?.error?.error || fallback;
  }
}
