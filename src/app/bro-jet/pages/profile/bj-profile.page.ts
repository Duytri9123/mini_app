import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { IonSpinner } from '@ionic/angular/standalone';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BjApiService } from '../../core/services/bj-api.service';
import { BjAuthService } from '../../core/services/bj-auth.service';
import { WalletApiService } from '../../features/wallet/services/wallet-api.service';
import { BjLoyaltyService, BjLoyaltyPoints } from '../../core/services/bj-loyalty.service';
import { BjToastService } from '../../core/services/bj-toast.service';
import { BjUser } from '../../core/interfaces/user.interface';
import { BjWallet } from '../../features/wallet/interfaces/wallet.types';
import { BJ_ICONS, BjIconKey } from '../../shared/icons/bj-icons';
import { environment } from 'src/environments/environment';

declare const google: any;

@Component({
  selector: 'app-bj-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, IonSpinner],
  templateUrl: './bj-profile.page.html',
})
export class BjProfilePage implements OnInit, OnDestroy {
  user: BjUser | null = null;

  fullName = '';
  email = '';
  phone = '';
  avatarUrl = '';

  isLoading = true;
  isSaving = false;
  isUpdatingAvatar = false;
  isLinkingGoogle = false;

  errorMsg = '';
  infoMsg = '';



  wallet: BjWallet | null = null;
  isLoadingWallet = false;

  // ── Counter animation ──────────────────────────────────────────
  displayPoints = 0;
  targetPoints = 0;
  private counterRaf?: number;

  // ── Avatar popup ───────────────────────────────────────────────
  showAvatarPopup = false;
  avatarInputUrl = '';
  avatarPreview = '';
  avatarPopupError = '';
  isUploadingFile = false;
  selectedFileName = '';

  private userSub?: Subscription;
  private readonly safeIcons = new Map<BjIconKey, SafeHtml>();
  private googleReady = false;
  private googleInitRetryCount = 0;
  private googleInitialized = false;
  private googleButtonEl: HTMLElement | null = null;

  constructor(
    private api: BjApiService,
    private authService: BjAuthService,
    private walletApiService: WalletApiService,
    private loyaltyService: BjLoyaltyService,
    private sanitizer: DomSanitizer,
    private toast: BjToastService,
  ) { }

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user) => {
      this.user = user;
      this.patchForm(user);
    });

    this.loadProfile();

    if (Capacitor.getPlatform() === 'web') {
      this.loadGoogleScript()
        .then(() => this.initGoogleSignIn())
        .catch(() => {
          this.toast.error('Không tải được Google Sign-In script.');
        });
    }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    if (this.counterRaf) cancelAnimationFrame(this.counterRaf);
  }

  get isGoogleLinked(): boolean {
    return !!this.user?.googleLinked;
  }

  get isGoogleReady(): boolean {
    return this.googleReady;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  icon(key: BjIconKey): SafeHtml {
    const cached = this.safeIcons.get(key);
    if (cached) return cached;
    const safe = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS[key]);
    this.safeIcons.set(key, safe);
    return safe;
  }

  // ── Counter animation ──────────────────────────────────────────
  startPointsCounter(): void {
    if (this.counterRaf) cancelAnimationFrame(this.counterRaf);
    const duration = 1800; // ms
    const start = performance.now();
    const from = 0;
    const to = this.targetPoints;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      this.displayPoints = Math.round(from + (to - from) * eased);
      if (progress < 1) {
        this.counterRaf = requestAnimationFrame(tick);
      } else {
        this.displayPoints = to;
      }
    };

    this.counterRaf = requestAnimationFrame(tick);
  }

  // ── Avatar popup ───────────────────────────────────────────────
  onAvatarClick(): void {
    if (this.isUpdatingAvatar || this.isSaving || this.isLoading) return;
    this.avatarInputUrl = (this.avatarUrl || this.user?.avatarUrl || '').trim();
    this.avatarPreview = this.avatarInputUrl;
    this.avatarPopupError = '';
    this.showAvatarPopup = true;
  }

  onAvatarUrlInput(): void {
    const val = this.avatarInputUrl.trim();
    this.avatarPreview = this.isValidAvatarUrl(val) ? val : '';
    this.avatarPopupError = '';
  }

  closeAvatarPopup(): void {
    this.showAvatarPopup = false;
    this.avatarInputUrl = '';
    this.avatarPreview = '';
    this.avatarPopupError = '';
  }

  confirmAvatarChange(): void {
    const val = this.avatarInputUrl.trim();
    const current = (this.avatarUrl || this.user?.avatarUrl || '').trim();

    if (val === current) {
      this.closeAvatarPopup();
      return;
    }

    if (val !== '' && !this.isValidAvatarUrl(val)) {
      this.avatarPopupError = 'URL không hợp lệ. Vui lòng dùng http:// hoặc https://';
      return;
    }

    this.showAvatarPopup = false;
    this.updateAvatar(val || null);
  }

  triggerFileInput(input: HTMLInputElement): void {
    if (this.isUploadingFile || this.isUpdatingAvatar) return;
    input.click();
  }

  onAvatarFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.avatarPopupError = '';

    if (!file.type.startsWith('image/')) {
      this.avatarPopupError = 'Chỉ hỗ trợ file ảnh (jpg, png, webp).';
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.avatarPopupError = 'Ảnh tối đa 2MB.';
      input.value = '';
      return;
    }

    this.selectedFileName = file.name;

    // Preview local file
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = reader.result as string;
    };
    reader.readAsDataURL(file);

    // Upload
    this.uploadAvatarFile(file);
    input.value = '';
  }

  private uploadAvatarFile(file: File): void {
    this.isUploadingFile = true;

    const formData = new FormData();
    formData.append('avatar', file);

    (this.api.post('auth/profile/avatar', formData) as any).subscribe({
      next: (res: any) => {
        this.isUploadingFile = false;
        this.applyUserResponse(res, 'Tải ảnh đại diện thành công.');
        this.closeAvatarPopup();
      },
      error: (err: any) => {
        this.isUploadingFile = false;
        this.avatarPopupError = this.extractErrorMessage(err, 'Tải ảnh đại diện thất bại.');
      },
    });
  }

  onLinkGoogle(): void {
    if (this.isLinkingGoogle || this.isGoogleLinked) {
      return;
    }

    if (Capacitor.getPlatform() !== 'web') {
      this.toast.warning('Liên kết Google hiện chỉ hỗ trợ trên web.');
      return;
    }

    if (!this.googleReady || !this.googleButtonEl) {
      this.initGoogleSignIn();
      this.toast.warning('Google Sign-In chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }


    this.googleButtonEl.click();
  }

  saveProfile(): void {
    if (this.isSaving) {
      return;
    }

    const fullName = this.fullName.trim();
    if (fullName.length < 2) {
      this.toast.warning('Họ tên tối thiểu 2 ký tự.');
      return;
    }

    const normalizedPhone = this.normalizePhoneForSave(this.phone);
    if (normalizedPhone && !/^0\d{9}$/.test(normalizedPhone)) {
      this.toast.warning('Số điện thoại không hợp lệ (ví dụ: 0971424792).');
      return;
    }

    this.isSaving = true;


    const payload = {
      full_name: fullName,
      email: this.email.trim() || null,
      phone: normalizedPhone,
      avatar_url: this.avatarUrl.trim() || null,
    };

    (this.api.patch('auth/profile', payload) as any).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.applyUserResponse(res, 'Cap nhat ho so thanh cong.');
      },
      error: (err: any) => {
        this.isSaving = false;
        this.toast.error(this.extractErrorMessage(err, 'Cập nhật hồ sơ thất bại.'));
      },
    });
  }

  private loadProfile(): void {
    if (!this.authService.isAuthenticated()) {
      this.isLoading = false;
      this.initGoogleSignIn();
      this.startPointsCounter();
      return;
    }

    this.isLoading = true;
    this.authService.syncCurrentUser().subscribe({
      next: (user) => {
        this.user = user;
        this.patchForm(user);
        this.isLoading = false;
        this.initGoogleSignIn();

        // Load additional info
        void this.loadPoints();
        void this.loadWallet();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toast.error(this.extractErrorMessage(err, 'Không tải được thông tin tài khoản.'));
        this.initGoogleSignIn();
        this.startPointsCounter();
      },
    });
  }

  private loadPoints(): void {
    this.loyaltyService.getPoints().subscribe({
      next: (res: BjLoyaltyPoints) => {
        this.targetPoints = res.available || 0;
        this.startPointsCounter();
      },
      error: () => {
        this.targetPoints = 0;
        this.startPointsCounter();
      }
    });
  }

  private patchForm(user: BjUser | null): void {
    if (!user) {
      return;
    }

    this.fullName = user.fullName || '';
    this.email = user.email || '';
    this.phone = user.phone || '';
    this.avatarUrl = user.avatarUrl || '';
  }

  private applyUserResponse(res: any, defaultMessage: string): void {
    const updated = this.authService.updateCurrentUser(res?.user ?? res);
    this.user = updated;
    this.patchForm(updated);
    this.toast.success(res?.message || defaultMessage);

  }

  private updateAvatar(avatarUrl: string | null): void {
    this.isUpdatingAvatar = true;


    (this.api.patch('auth/profile', { avatar_url: avatarUrl }) as any).subscribe({
      next: (res: any) => {
        this.isUpdatingAvatar = false;
        this.applyUserResponse(
          res,
          avatarUrl ? 'Cap nhat avatar thanh cong.' : 'Da xoa avatar thanh cong.',
        );
      },
      error: (err: any) => {
        this.isUpdatingAvatar = false;
        this.toast.error(this.extractErrorMessage(err, 'Cập nhật avatar thất bại.'));
      },
    });
  }

  private isValidAvatarUrl(value: string): boolean {
    return /^https?:\/\/.+/i.test(value);
  }

  private normalizePhoneForSave(value: string): string | null {
    const raw = (value || '').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '');
    const digits = raw.replace(/\D/g, '');

    if (digits === '') {
      return null;
    }
    if (digits.startsWith('84') && digits.length >= 11) {
      return `0${digits.slice(2, 11)}`;
    }
    if (digits.startsWith('0')) {
      return digits.slice(0, 10);
    }
    if (digits.length === 9) {
      return `0${digits}`;
    }

    return digits;
  }

  private async loadGoogleScript(): Promise<void> {
    if (document.getElementById('google-link-script')) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'google-link-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Khong tai duoc Google script.'));
      document.head.appendChild(script);
    });
  }

  private initGoogleSignIn(): void {
    if (Capacitor.getPlatform() !== 'web') {
      return;
    }

    const clientId = (environment as any).GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      this.toast.error('Thiếu cấu hình GOOGLE_CLIENT_ID.');
      return;
    }

    const originalContainer = document.getElementById('googleLinkButtonOriginal');
    if (!originalContainer) {
      this.scheduleGoogleInitRetry();
      return;
    }

    if (!this.googleInitialized) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => this.handleGoogleCredential(response),
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });
      this.googleInitialized = true;
    }

    if (!originalContainer.firstElementChild) {
      google.accounts.id.renderButton(originalContainer, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 220,
      });
    }

    setTimeout(() => {
      this.googleButtonEl = originalContainer.querySelector('div[role="button"]') as HTMLElement | null;
      this.googleReady = !!this.googleButtonEl;

      if (this.googleReady) {
        this.googleInitRetryCount = 0;
      } else {
        this.scheduleGoogleInitRetry();
      }
    }, 400);
  }

  private scheduleGoogleInitRetry(): void {
    if (this.googleReady || this.googleInitRetryCount >= 8) {
      return;
    }

    this.googleInitRetryCount += 1;
    setTimeout(() => this.initGoogleSignIn(), 250);
  }

  private handleGoogleCredential(response: any): void {
    if (!response?.credential) {
      this.toast.error('Không nhận được Google token.');
      return;
    }

    this.isLinkingGoogle = true;


    (this.api.post('auth/google/link', { token: response.credential }) as any).subscribe({
      next: (res: any) => {
        this.isLinkingGoogle = false;
        this.applyUserResponse(res, 'Lien ket Google thanh cong.');
      },
      error: (err: any) => {
        this.isLinkingGoogle = false;
        this.toast.error(this.extractErrorMessage(err, 'Liên kết Google thất bại.'));
      },
    });
  }

  private extractErrorMessage(err: any, fallback: string): string {
    const firstValidation = err?.error?.errors
      ? (Object.values(err.error.errors)[0] as any)
      : null;

    if (Array.isArray(firstValidation) && firstValidation.length > 0) {
      return String(firstValidation[0]);
    }

    return err?.error?.message || err?.error?.error || fallback;
  }

  private loadWallet(): Promise<void> {
    this.isLoadingWallet = true;

    return new Promise((resolve) => {
      this.walletApiService.getBalance().subscribe({
        next: (wallet: BjWallet) => {
          this.wallet = wallet;
          this.isLoadingWallet = false;
          resolve();
        },
        error: () => {
          this.isLoadingWallet = false;
          resolve();
        },
      });
    });
  }
}
