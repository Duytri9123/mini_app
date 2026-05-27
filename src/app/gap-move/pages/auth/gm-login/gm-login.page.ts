import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { GmAuthService } from '../../../core/services/gm-auth.service';
import { GmToastService } from '../../../core/services/gm-toast.service';

@Component({
  selector: 'app-gm-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, IonicModule],
  templateUrl: './gm-login.page.html',
})
export class GmLoginPage {
  readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  isSubmitting = false;
  showPassword = false;

  constructor(
    private authService: GmAuthService,
    private toastService: GmToastService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  get emailInvalid(): boolean {
    const control = this.loginForm.controls.email;
    return control.invalid && control.touched;
  }

  get passwordInvalid(): boolean {
    const control = this.loginForm.controls.password;
    return control.invalid && control.touched;
  }

  login(): void {
    if (this.isSubmitting) {
      return;
    }

    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      this.toastService.error('Vui lòng nhập email và mật khẩu hợp lệ');
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    this.isSubmitting = true;

    this.authService.loginWithCredentials({ email, password }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastService.success('Đăng nhập thành công');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/gap-move/home';
        this.router.navigateByUrl(returnUrl, { replaceUrl: true });
      },
      error: (error) => {
        this.isSubmitting = false;
        this.toastService.error(this.extractApiError(error, 'Email hoặc mật khẩu không đúng'));
      },
    });
  }

  private extractApiError(error: any, fallback: string): string {
    if (error?.error?.errors) {
      const first = Object.values(error.error.errors)[0] as unknown;
      if (Array.isArray(first) && first.length > 0) {
        return String(first[0]);
      }
    }

    return error?.error?.message || error?.error?.error || fallback;
  }
}
