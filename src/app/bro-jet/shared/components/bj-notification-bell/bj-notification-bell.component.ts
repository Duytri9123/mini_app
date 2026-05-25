import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  BjNotificationService,
  BjNotification,
  NotificationType,
  NOTIFICATION_TYPE_CONFIG,
  NotificationTypeConfig
} from '../../../core/services/bj-notification.service';
import { BjAuthService } from '../../../core/services/bj-auth.service';
import { Subscription } from 'rxjs';
import { BJ_ICONS } from '../../icons/bj-icons';
import { SafeSvgPipe } from '../../pipes/safe-svg.pipe';

/**
 * All notification types for settings toggle
 */
const ALL_NOTIFICATION_TYPES: { type: NotificationType; label: string }[] = [
  // { type: 'wallet_topup', label: 'Nạp ví' },
  // { type: 'wallet_withdraw', label: 'Rút ví' },
  // { type: 'withdraw_request', label: 'Yêu cầu rút tiền' },
  { type: 'booking', label: 'Booking' },
  { type: 'system', label: 'Hệ thống' },
];

/**
 * Format time to human-readable Vietnamese string
 */
function fmtTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return d.toLocaleDateString('vi-VN');
}

@Component({
  selector: 'app-bj-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeSvgPipe],
  templateUrl: './bj-notification-bell.component.html',
  styleUrls: ['./bj-notification-bell.component.scss'],
  host: { class: 'relative block' }
})
export class BjNotificationBellComponent implements OnInit, OnDestroy {
  @Input() showNotification: boolean = true;
  @Output() notificationClick = new EventEmitter<BjNotification>();
  @Output() opened = new EventEmitter<void>();

  readonly icons = BJ_ICONS;
  readonly allTypes = ALL_NOTIFICATION_TYPES;
  readonly typeConfig = NOTIFICATION_TYPE_CONFIG;

  isOpen = false;
  showSettings = false;
  isLoading = false;
  notifications: BjNotification[] = [];
  unreadCount = 0;
  isAuthenticated = false;

  // Notification preferences (persisted in localStorage)
  prefs = {
    enabled: true,
    showToast: true,
    playSound: true,
    enabledTypes: new Set<NotificationType>(['wallet_topup', 'wallet_withdraw', 'withdraw_request', 'booking', 'system'])
  };

  private readonly PREFS_STORAGE_KEY = 'bj_notification_prefs';

  private userSub?: Subscription;
  private notifSub?: Subscription;
  private unreadSub?: Subscription;

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    private authService: BjAuthService,
    private notificationService: BjNotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadPrefs();

    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      if (this.isAuthenticated) {
        this.loadUnreadCount();
      }
      this.cdr.markForCheck();
    });

    this.unreadSub = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.notifSub?.unsubscribe();
    this.unreadSub?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    this.showSettings = false;

    if (this.isOpen) {
      this.opened.emit();
      // Only load from API if we haven't loaded yet or cache is empty
      if (this.notifications.length === 0) {
        this.loadNotifications();
      }
    }
  }

  toggleSettings(event: Event): void {
    event.stopPropagation();
    this.showSettings = !this.showSettings;
  }

  // ═══ DATA LOADING ═══

  loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe();
  }

  loadNotifications(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.notifSub = this.notificationService.getNotifications(1, 20).subscribe({
      next: (res) => {
        this.notifications = res.data || [];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ═══ ICON & STYLE HELPERS ═══

  getNotificationIcon(type: NotificationType): NotificationTypeConfig {
    return NOTIFICATION_TYPE_CONFIG[type] || NOTIFICATION_TYPE_CONFIG.default;
  }

  getNotificationSvg(type: NotificationType): string {
    switch (type) {
      case 'wallet_topup': return BJ_ICONS.NAV_WALLET;
      case 'wallet_withdraw': return BJ_ICONS.SWAP_HORIZONTAL;
      case 'withdraw_request': return BJ_ICONS.MONEY_ALT;
      case 'booking': return BJ_ICONS.NAV_BOOKING;
      case 'system': return BJ_ICONS.VERIFY_USER;
      default: return BJ_ICONS.BELL;
    }
  }

  getTypeLabel(type: NotificationType): string {
    return NOTIFICATION_TYPE_CONFIG[type]?.label || 'Thông báo';
  }

  formatTime(timestamp: string): string {
    return fmtTime(timestamp);
  }

  // ═══ ACTIONS ═══

  markAsRead(notification: BjNotification, event: Event): void {
    event.stopPropagation();

    if (!notification.is_read) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        notification.is_read = true;
        this.cdr.markForCheck();
      });
    }
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();

    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.is_read = true);
      this.cdr.markForCheck();
    });
  }

  onNotificationClick(notification: BjNotification, event: Event): void {
    event.stopPropagation();

    // Mark as read
    if (!notification.is_read) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        notification.is_read = true;
        this.cdr.markForCheck();
      });
    }

    // Emit event
    this.notificationClick.emit(notification);

    // Close dropdown
    this.isOpen = false;

    // Navigate based on notification type
    this.navigateByType(notification);
  }

  /**
   * Navigate to the appropriate page based on notification type
   */
  private navigateByType(notification: BjNotification): void {
    switch (notification.type) {
      case 'wallet_topup':
      case 'wallet_withdraw':
      case 'withdraw_request':
        // this.router.navigate(['/bro-jet/wallet']);
        this.router.navigate(['/bro-jet/notifications']);
        break;
      case 'booking':
        this.router.navigate(['/bro-jet/bookings']);
        break;
      case 'system':
        this.router.navigate(['/bro-jet/notifications']);
        break;
      default:
        this.router.navigate(['/bro-jet/notifications']);
        break;
    }
  }

  goToNotificationsPage(event: Event): void {
    event.stopPropagation();
    this.isOpen = false;
    this.router.navigate(['/bro-jet/notifications']);
  }

  refreshNotifications(event: Event): void {
    event.stopPropagation();
    this.notifications = []; // Clear cache to force reload
    this.loadNotifications();
  }

  // ═══ SETTINGS / PREFERENCES ═══

  isTypeEnabled(type: NotificationType): boolean {
    return this.prefs.enabledTypes.has(type);
  }

  toggleType(type: NotificationType): void {
    if (this.prefs.enabledTypes.has(type)) {
      this.prefs.enabledTypes.delete(type);
    } else {
      this.prefs.enabledTypes.add(type);
    }
    this.savePrefs();
  }

  toggleMasterEnabled(): void {
    this.prefs.enabled = !this.prefs.enabled;
    this.savePrefs();
  }

  toggleSound(): void {
    this.prefs.playSound = !this.prefs.playSound;
    this.savePrefs();
  }

  toggleToast(): void {
    this.prefs.showToast = !this.prefs.showToast;
    this.savePrefs();
  }

  private loadPrefs(): void {
    try {
      const stored = localStorage.getItem(this.PREFS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.prefs.enabled = parsed.enabled ?? true;
        this.prefs.showToast = parsed.showToast ?? true;
        this.prefs.playSound = parsed.playSound ?? true;
        this.prefs.enabledTypes = new Set(parsed.enabledTypes || ['wallet_topup', 'wallet_withdraw', 'withdraw_request', 'booking', 'system']);
      }
    } catch (e) {
      console.warn('[NotificationBell] Failed to load prefs:', e);
    }
  }

  private savePrefs(): void {
    try {
      const data = {
        enabled: this.prefs.enabled,
        showToast: this.prefs.showToast,
        playSound: this.prefs.playSound,
        enabledTypes: Array.from(this.prefs.enabledTypes),
      };
      localStorage.setItem(this.PREFS_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[NotificationBell] Failed to save prefs:', e);
    }
  }
}
