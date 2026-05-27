import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { GmAuthService } from '../../../core/services/gm-auth.service';
import { GmToastService } from '../../../core/services/gm-toast.service';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmation = control.get('password_confirmation')?.value;

  if (password && confirmation && password !== confirmation) {
    return { passwordMismatch: true };
  }

  return null;
};

@Component({
  selector: 'app-gm-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, IonicModule],
  templateUrl: './gm-register.page.html',
})
export class GmRegisterPage {
  readonly registerForm = new FormGroup(
    {
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(255)],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),
      password_confirmation: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      terms: new FormControl(false, {
        nonNullable: true,
        validators: [Validators.requiredTrue],
      }),
    },
    { validators: passwordMatchValidator },
  );

  isSubmitting = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private authService: GmAuthService,
    private toastService: GmToastService,
    private router: Router,
  ) {}

  get nameInvalid(): boolean {
    const control = this.registerForm.controls.name;
    return control.invalid && control.touched;
  }

  get emailInvalid(): boolean {
    const control = this.registerForm.controls.email;
    return control.invalid && control.touched;
  }

  get passwordInvalid(): boolean {
    const control = this.registerForm.controls.password;
    return control.invalid && control.touched;
  }

  get confirmationInvalid(): boolean {
    const control = this.registerForm.controls.password_confirmation;
    return (control.invalid || this.registerForm.hasError('passwordMismatch')) && control.touched;
  }

  get termsInvalid(): boolean {
    const control = this.registerForm.controls.terms;
    return control.invalid && control.touched;
  }

  register(): void {
    if (this.isSubmitting) {
      return;
    }

    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) {
      this.toastService.error('Vui lòng kiểm tra lại thông tin đăng ký');
      return;
    }

    const rawValue = this.registerForm.getRawValue();
    const payload = {
      name: rawValue.name,
      email: rawValue.email,
      password: rawValue.password,
      password_confirmation: rawValue.password_confirmation,
    };
    this.isSubmitting = true;

    this.authService.register(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastService.success('Tạo tài khoản thành công');
        this.router.navigateByUrl('/gap-move/home', { replaceUrl: true });
      },
      error: (error) => {
        this.isSubmitting = false;
        this.toastService.error(this.extractApiError(error, 'Đăng ký thất bại. Vui lòng thử lại'));
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
