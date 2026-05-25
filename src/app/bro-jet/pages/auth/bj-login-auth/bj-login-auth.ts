import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { BjAuthService } from '../../../core/services/bj-auth.service';
import { BjGoogleAuthService } from '../../../core/services/bj-google-auth.service';
import { BJ_ICONS } from '../../../shared/icons/bj-icons';
import { SafeSvgPipe } from '../../../shared/pipes/safe-svg.pipe';

@Component({
  selector: 'bj-login-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SafeSvgPipe],
  templateUrl: './bj-login-auth.html',
  styleUrls: ['../../../shared/styles/bj-auth.scss', './bj-login-auth.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BjLoginAuthPage implements OnInit, OnDestroy {
  readonly icons = BJ_ICONS;
  loginForm!: FormGroup;
  loading = false;
  isGoogleLoading = false;
  errorMsg = '';
  showPassword = false;

  private _sub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: BjAuthService,
    private googleAuth: BjGoogleAuthService,
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });

    this.googleAuth.init();
  }

  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  submitLogin(): void {
    if (this.loading) return;
    this.errorMsg = '';

    const { email, password } = this.loginForm.value;
    let identifier = (email || '').trim();
    const pw = (password || '').trim();

    // Normalize phone if it looks like a phone number
    if (!identifier.includes('@')) {
      identifier = this._normalizePhone(identifier);
    }

    // Validate identifier (email or phone)
    if (!identifier) {
      this.errorMsg = 'Vui lòng nhập email hoặc số điện thoại.';
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(0[3|5|7|8|9])\d{8}$/;
    if (!emailRegex.test(identifier) && !phoneRegex.test(identifier)) {
      this.errorMsg = 'Email hoặc số điện thoại không hợp lệ.';
      return;
    }

    // Validate password
    if (!pw) {
      this.errorMsg = 'Vui lòng nhập mật khẩu.';
      return;
    }

    this.loading = true;

    this.authService.loginWithCredentials({ email: identifier, password: pw }).subscribe({
      next: () => {
        this.loading = false;
        this._navigateAfterLogin();
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message || '';
        if (msg.toLowerCase().includes('không tìm thấy') ||
            msg.toLowerCase().includes('sai') ||
            msg.toLowerCase().includes('incorrect')) {
          this.errorMsg = 'Email/số điện thoại hoặc mật khẩu không đúng.';
        } else {
          this.errorMsg = this._extractError(err, 'Đăng nhập thất bại. Vui lòng thử lại.');
        }
      },
    });
  }

  // ── Google Login ──────────────────────────────────────────────────────────

  loginWithGoogle(): void {
    if (this.loading || this.isGoogleLoading) return;
    this.isGoogleLoading = true;
    this.errorMsg = '';

    this.googleAuth.signIn().then((res) => {
      this.authService.storeSessionFromResponse(res);
      this._navigateAfterLogin();
    }).catch((err) => {
      this.errorMsg = typeof err === 'string' ? err : 'Đăng nhập Google thất bại.';
    }).finally(() => {
      this.isGoogleLoading = false;
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/bro-jet/home';
    this.router.navigateByUrl(returnUrl, { replaceUrl: true });
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
