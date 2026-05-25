import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import {
  BjNotification,
  BjNotificationService,
  NotificationType,
  NOTIFICATION_TYPE_CONFIG
} from '../../core/services/bj-notification.service';
import { BjNotificationItemComponent } from '../../shared/components/bj-notification-item/bj-notification-item.component';

@Component({
  selector: 'app-bj-notifications',
  standalone: true,
  imports: [CommonModule, IonicModule, BjNotificationItemComponent],
  templateUrl: './bj-notifications.page.html',
})
export class BjNotificationsPage implements OnInit {
  notifications: BjNotification[] = [];
  isLoading = false;
  filterType: NotificationType | null = null;

  notificationTypes: { type: NotificationType; label: string }[] = [
    { type: 'wallet_topup', label: 'Nạp ví' },
    { type: 'wallet_withdraw', label: 'Rút ví' },
    { type: 'withdraw_request', label: 'Yêu cầu rút tiền' },
    { type: 'booking', label: 'Booking' },
    { type: 'system', label: 'Hệ thống' },
  ];

  private readonly TYPE_ICONS: Record<string, string> = {
    wallet_topup: '💰',
    wallet_withdraw: '💸',
    withdraw_request: '📤',
    booking: '📅',
    system: '⚙️',
  };

  constructor(
    private notificationService: BjNotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications(event?: any) {
    this.isLoading = true;
    this.notificationService.getNotifications(1, 50, null, this.filterType).subscribe({
      next: (res) => {
        this.notifications = res.data || [];
        this.isLoading = false;
        if (event) event.target.complete();
      },
      error: () => {
        this.isLoading = false;
        if (event) event.target.complete();
      }
    });
  }

  onRead(id: string) {
    this.notificationService.markAsRead(id).subscribe(() => {
      const notch = this.notifications.find(n => n.id === id);
      if (notch) notch.is_read = true;
    });
  }

  onMarkAllAsRead() {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.is_read = true);
    });
  }

  onItemClick(notification: BjNotification) {
    if (!notification.is_read) {
      this.onRead(notification.id);
    }

    // Navigate based on type
    switch (notification.type) {
      case 'wallet_topup':
      case 'wallet_withdraw':
      case 'withdraw_request':
        this.router.navigate(['/bro-jet/wallet']);
        break;
      case 'booking':
        this.router.navigate(['/bro-jet/bookings']);
        break;
      default:
        break;
    }
  }

  // ═══ HELPERS ═══

  getIcon(type: NotificationType): string {
    return this.TYPE_ICONS[type] ?? '🔔';
  }

  getIconBg(type: NotificationType): string {
    return NOTIFICATION_TYPE_CONFIG[type]?.bg || 'bg-zinc-100';
  }

  getTypeLabel(type: NotificationType): string {
    return NOTIFICATION_TYPE_CONFIG[type]?.label || 'Thông báo';
  }

  getTypeBadgeClass(type: NotificationType): string {
    const config = NOTIFICATION_TYPE_CONFIG[type];
    if (!config) return 'bg-zinc-100 text-zinc-500';
    return `${config.bg} ${config.text}`;
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  }
}
