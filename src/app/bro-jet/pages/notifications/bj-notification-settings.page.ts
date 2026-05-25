import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  IonContent,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { BJ_ICONS, BjIconKey } from '../../shared/icons/bj-icons';

export interface NotificationChannel {
  key: string;
  label: string;
  description: string;
  icon: BjIconKey;
  iconBg: string;
  iconColor: string;
  enabled: boolean;
}

export interface NotificationGroup {
  title: string;
  channels: NotificationChannel[];
}

@Component({
  selector: 'app-bj-notification-settings',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonSpinner,
  ],
  templateUrl: './bj-notification-settings.page.html',
})
export class BjNotificationSettingsPage implements OnInit {
  private readonly safeIcons = new Map<BjIconKey, SafeHtml>();
  isLoading = false;
  isSaving = false;

  /** Master toggle */
  allNotificationsEnabled = true;

  /** Notification groups */
  groups: NotificationGroup[] = [
    {
      title: 'Đặt lịch & Dịch vụ',
      channels: [
        {
          key: 'booking_confirmed',
          label: 'Xác nhận đặt lịch',
          description: 'Thông báo khi đặt lịch thành công',
          icon: 'CALENDAR',
          iconBg: 'bg-primary/10',
          iconColor: 'text-primary',
          enabled: true,
        },
        {
          key: 'wash_progress',
          label: 'Tiến độ rửa xe',
          description: 'Cập nhật trạng thái rửa xe realtime',
          icon: 'CAR_WASH',
          iconBg: 'bg-blue-50',
          iconColor: 'text-blue-500',
          enabled: true,
        },
        {
          key: 'wash_complete',
          label: 'Hoàn thành dịch vụ',
          description: 'Thông báo khi xe đã rửa xong',
          icon: 'CHECK_CIRCLE',
          iconBg: 'bg-green-50',
          iconColor: 'text-green-500',
          enabled: true,
        },
        {
          key: 'booking_cancelled',
          label: 'Hủy đặt lịch',
          description: 'Thông báo khi lịch bị hủy',
          icon: 'CANCEL',
          iconBg: 'bg-red-50',
          iconColor: 'text-red-500',
          enabled: true,
        },
      ],
    },
    {
      title: 'Ví & Thanh toán',
      channels: [
        // {
        //   key: 'wallet_topup',
        //   label: 'Nạp tiền thành công',
        //   description: 'Thông báo khi nạp tiền vào ví',
        //   icon: 'NAV_WALLET',
        //   iconBg: 'bg-primary/10',
        //   iconColor: 'text-primary',
        //   enabled: true,
        // },
        {
          key: 'payment_success',
          label: 'Thanh toán thành công',
          description: 'Xác nhận thanh toán dịch vụ',
          icon: 'COIN',
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-500',
          enabled: true,
        },
      ],
    },
    {
      title: 'Khuyến mãi & Ưu đãi',
      channels: [
        {
          key: 'promo',
          label: 'Khuyến mãi mới',
          description: 'Voucher, giảm giá và ưu đãi đặc biệt',
          icon: 'VOUCHER',
          iconBg: 'bg-rose-50',
          iconColor: 'text-rose-500',
          enabled: true,
        },
        {
          key: 'loyalty_points',
          label: 'Tích điểm & Thưởng',
          description: 'Cập nhật điểm thưởng và hạng thành viên',
          icon: 'STARS',
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-500',
          enabled: true,
        },
      ],
    },
    {
      title: 'Hệ thống',
      channels: [
        {
          key: 'system',
          label: 'Thông báo hệ thống',
          description: 'Bảo trì, cập nhật ứng dụng',
          icon: 'SHIELD',
          iconBg: 'bg-slate-100',
          iconColor: 'text-slate-500',
          enabled: true,
        },
        {
          key: 'news',
          label: 'Tin tức & Bài viết',
          description: 'Bài viết mới từ BRO JET',
          icon: 'ARTICLE',
          iconBg: 'bg-indigo-50',
          iconColor: 'text-indigo-500',
          enabled: false,
        },
      ],
    },
  ];

  constructor(
    private sanitizer: DomSanitizer,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  icon(key: BjIconKey): SafeHtml {
    const cached = this.safeIcons.get(key);
    if (cached) return cached;
    const safe = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS[key]);
    this.safeIcons.set(key, safe);
    return safe;
  }

  get enabledCount(): number {
    return this.groups.reduce((sum, g) => sum + g.channels.filter(c => c.enabled).length, 0);
  }

  get totalCount(): number {
    return this.groups.reduce((sum, g) => sum + g.channels.length, 0);
  }

  toggleMaster(): void {
    this.allNotificationsEnabled = !this.allNotificationsEnabled;
    this.groups.forEach(g => g.channels.forEach(c => (c.enabled = this.allNotificationsEnabled)));
    this.saveSettings();
  }

  toggleChannel(channel: NotificationChannel): void {
    channel.enabled = !channel.enabled;
    this.allNotificationsEnabled = this.groups.every(g => g.channels.every(c => c.enabled));
    this.saveSettings();
  }

  private loadSettings(): void {
    this.isLoading = true;
    // Load from localStorage (or API in future)
    const saved = localStorage.getItem('bj_notification_settings');
    if (saved) {
      try {
        const settings: Record<string, boolean> = JSON.parse(saved);
        this.groups.forEach(g =>
          g.channels.forEach(c => {
            if (settings[c.key] !== undefined) {
              c.enabled = settings[c.key];
            }
          }),
        );
        this.allNotificationsEnabled = this.groups.every(g => g.channels.every(c => c.enabled));
      } catch {
        // ignore parse errors
      }
    }
    this.isLoading = false;
  }

  private saveSettings(): void {
    const settings: Record<string, boolean> = {};
    this.groups.forEach(g => g.channels.forEach(c => (settings[c.key] = c.enabled)));
    localStorage.setItem('bj_notification_settings', JSON.stringify(settings));
    this.showToast('Đã lưu cấu hình');
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1500,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
  }
}
