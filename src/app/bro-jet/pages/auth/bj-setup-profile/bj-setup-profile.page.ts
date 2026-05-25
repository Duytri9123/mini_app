import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BjApiService } from '../../../core/services/bj-api.service';
import { BjAuthService } from '../../../core/services/bj-auth.service';
import { BjToastService } from '../../../core/services/bj-toast.service';
import { BjUser } from '../../../core/interfaces/user.interface';
import { BJ_ICONS } from '../../../shared/icons/bj-icons';
import { SafeSvgPipe } from '../../../shared/pipes/safe-svg.pipe';

@Component({
  selector: 'app-bj-setup-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SafeSvgPipe],
  templateUrl: './bj-setup-profile.page.html',
  styleUrls: ['../../../shared/styles/bj-auth.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BjSetupProfilePage implements OnInit {
  readonly icons = BJ_ICONS;

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  agreeTerms = false;

  showPassword = false;
  showConfirmPassword = false;

  avatarUrl = '';
  avatarPreview = 'assets/img/avata_default.png';
  selectedAvatarName = '';

  isUploadingAvatar = false;
  isSaving = false;

  errorMsg = '';
  infoMsg = '';



  constructor(
    private api: BjApiService,
    private authService: BjAuthService,
    private router: Router,
    private toast: BjToastService,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/bro-jet/login']);
      return;
    }

    this.patchForm(this.authService.getCurrentUser());

    this.authService.syncCurrentUser().subscribe({
      next: (user) => this.patchForm(user),
      error: () => {},
    });
  }

  triggerAvatarInput(input: HTMLInputElement): void {
    if (this.isUploadingAvatar || this.isSaving) return;
    input.click();
  }

  onAvatarFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;



    if (!file.type.startsWith('image/')) {
      this.toast.error('Chỉ hỗ trợ file ảnh (jpg, png, webp).');
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.toast.error('Ảnh tối đa 2MB.');
      input.value = '';
      return;
    }

    this.selectedAvatarName = file.name;
    this.uploadAvatar(file);
    input.value = '';
  }

  submitProfile(): void {
    if (this.isSaving || this.isUploadingAvatar) return;

    const fullName = this.fullName.trim();
    const email = this.email.trim().toLowerCase();



    if (fullName.length < 2) {
      this.toast.warning('Họ tên tối thiểu 2 ký tự.');
      return;
    }

    // Email is optional, but if provided must be valid
    if (email && !this.isValidEmail(email)) {
      this.toast.warning('Email không hợp lệ.');
      return;
    }

    if (this.password.length < 8) {
      this.toast.warning('Mật khẩu tối thiểu 8 ký tự.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.toast.warning('Xác nhận mật khẩu không khớp.');
      return;
    }

    if (!this.agreeTerms) {
      this.toast.warning('Vui lòng đồng ý với Điều khoản và Chính sách để tiếp tục.');
      return;
    }

    this.isSaving = true;

    const payload: any = {
      full_name: fullName,
      avatar_url: this.avatarUrl.trim() || null,
      password: this.password,
      password_confirmation: this.confirmPassword,
    };

    // Only send email if provided
    if (email) {
      payload.email = email;
    }

    (this.api.patch('auth/profile', payload) as any).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.applyUserResponse(res);
        this.toast.success('Cập nhật hồ sơ thành công!');
        this.router.navigate(['/bro-jet/welcome'], { replaceUrl: true });
      },
      error: (err: any) => {
        this.isSaving = false;
        this.toast.error(this.extractErrorMessage(err, 'Không thể cập nhật thông tin.'));
      },
    });
  }

  private uploadAvatar(file: File): void {
    this.isUploadingAvatar = true;

    const formData = new FormData();
    formData.append('avatar', file);

    (this.api.post('auth/profile/avatar', formData) as any).subscribe({
      next: (res: any) => {
        this.isUploadingAvatar = false;
        this.applyUserResponse(res);
        this.toast.success('Tải ảnh đại diện thành công.');
      },
      error: (err: any) => {
        this.isUploadingAvatar = false;
        this.toast.error(this.extractErrorMessage(err, 'Tải ảnh đại diện thất bại.'));
      },
    });
  }

  private applyUserResponse(res: any): void {
    const updated = this.authService.updateCurrentUser(res?.user ?? res);
    this.patchForm(updated);
  }

  private patchForm(user: BjUser | null): void {
    if (!user) return;

    const nextName = (user.fullName || '').trim();
    const nextEmail = (user.email || '').trim();
    const nextAvatar = (user.avatarUrl || '').trim();

    this.fullName = nextName.toLowerCase() === 'brojet user' ? '' : nextName;
    this.email = nextEmail.toLowerCase().endsWith('@firebase-user.local') ? '' : nextEmail;
    this.avatarUrl = nextAvatar;
    this.avatarPreview = this.avatarUrl || 'assets/img/avata_default.png';
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private extractErrorMessage(err: any, fallback: string): string {
    const firstValidation = err?.error?.errors
      ? Object.values(err.error.errors)[0] as any
      : null;

    if (Array.isArray(firstValidation) && firstValidation.length > 0) {
      return String(firstValidation[0]);
    }

    return err?.error?.message || err?.error?.error || fallback;
  }
}
