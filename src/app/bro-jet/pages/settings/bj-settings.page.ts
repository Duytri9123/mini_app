import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BjAuthService } from '../../core/services/bj-auth.service';
import { BjLoyaltyService, BjLoyaltyPoints } from '../../core/services/bj-loyalty.service';
import { BjUser } from '../../core/interfaces/user.interface';
import { BJ_ICONS, BjIconKey } from '../../shared/icons/bj-icons';

interface MenuItem {
  label: string;
  icon: string;
  action: () => void;
}

@Component({
  selector: 'app-bj-settings',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonSpinner,
  ],
  templateUrl: './bj-settings.page.html',
})
export class BjSettingsPage implements OnInit, OnDestroy {
  user: BjUser | null = null;
  loyaltyPoints: BjLoyaltyPoints | null = null;
  isLoadingPoints = false;
  isLoggingOut = false;

  readonly menuItems: MenuItem[] = [
    {
      label: 'Tích điểm & thành viên',
      icon: 'star',
      action: () => this.router.navigate(['/bro-jet/member']),
    },
    {
      label: 'Xe của tôi',
      icon: 'car',
      action: () => this.router.navigate(['/bro-jet/vehicles']),
    },
    {
      label: 'Ví của tôi',
      icon: 'wallet',
      action: () => this.router.navigate(['/bro-jet/wallet']),
    },
    // {
    //   label: 'Lịch sử đặt lịch',
    //   icon: 'calendar',
    //   action: () => this.showComingSoon(),
    // },
    {
      label: 'Voucher',
      icon: 'voucher',
      action: () => this.router.navigate(['/bro-jet/voucher']),
    },
    {
      label: 'Thông báo',
      icon: 'bell',
      action: () => this.router.navigate(['/bro-jet/notification-settings']),
    },
    {
      label: 'Hỗ trợ',
      icon: 'support',
      action: () => this.router.navigate(['/bro-jet/faq']),
    },
    {
      label: 'Bài viết',
      icon: 'article',
      action: () => this.router.navigate(['/bro-jet/posts']),
    },
    {
      label: 'Điều khoản & Chính sách',
      icon: 'policy',
      action: () => this.router.navigate(['/bro-jet/policy']),
    },
  ];

  private sub?: Subscription;
  private readonly safeIcons = new Map<BjIconKey, SafeHtml>();

  constructor(
    private authService: BjAuthService,
    private loyaltyService: BjLoyaltyService,
    public router: Router,
    private toastCtrl: ToastController,
    private sanitizer: DomSanitizer,
  ) { }

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.sub = this.authService.currentUser$.subscribe((u) => {
      this.user = u;
    });

    if (this.authService.isAuthenticated()) {
      this.authService.syncCurrentUser().subscribe({
        error: () => {
          // Keep local cached profile when network request fails.
        },
      });
    }

    this.loadPoints();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  getInitials(fullName: string): string {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  icon(key: BjIconKey): SafeHtml {
    const cached = this.safeIcons.get(key);
    if (cached) return cached;
    const safe = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS[key]);
    this.safeIcons.set(key, safe);
    return safe;
  }

  onLogout(): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    this.authService.logout().subscribe({
      next: () => {
        this.isLoggingOut = false;
        this.router.navigate(['/bro-jet/login']);
      },
      error: () => {
        // Even on error, clear session and redirect
        this.isLoggingOut = false;
        this.router.navigate(['/bro-jet/login']);
      },
    });
  }

  private loadPoints(): void {
    this.isLoadingPoints = true;
    this.loyaltyService.getPoints().subscribe({
      next: (points) => {
        this.loyaltyPoints = points;
        this.isLoadingPoints = false;
      },
      error: () => {
        this.isLoadingPoints = false;
      },
    });
  }

  private async showComingSoon(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: 'Sắp ra mắt',
      duration: 2000,
      position: 'bottom',
      color: 'medium',
    });
    await toast.present();
  }

  onEditProfile() {
    this.router.navigate(['/bro-jet/profile']);
  }

  goToLogin(): void {
    this.router.navigate(['/bro-jet/login']);
  }

  get isGoogleLinked(): boolean {
    return !!this.user?.googleLinked;
  }
}
