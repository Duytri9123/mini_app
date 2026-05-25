import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { BjApiService } from './bj-api.service';

/**
 * Notification types from API
 */
export type NotificationType =
  | 'wallet_topup'
  | 'wallet_withdraw'
  | 'withdraw_request'
  | 'booking'
  | 'system';

/**
 * Notification model matching API response
 */
export interface BjNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  created_at_human: string;
}

/**
 * API response for GET /api/notifications
 */
export interface BjNotificationListResponse {
  data: BjNotification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    unread_count: number;
  };
}

/**
 * API response for GET /api/notifications/unread-count
 */
export interface BjUnreadCountResponse {
  unread_count: number;
}

/**
 * API response for PATCH /api/notifications/{id}/read
 */
export interface BjMarkReadResponse {
  success: boolean;
  data: BjNotification;
}

/**
 * API response for PATCH /api/notifications/read-all
 */
export interface BjMarkAllReadResponse {
  success: boolean;
  updated: number;
  unread_count: number;
}

/**
 * Notification type config for icons and display
 */
export interface NotificationTypeConfig {
  icon: string;
  bg: string;
  text: string;
  label: string;
}

/**
 * Icon & style config per notification type
 * Separated for easy maintenance and reuse
 */
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType | 'default', NotificationTypeConfig> = {
  wallet_topup: {
    icon: 'wallet_topup',
    bg: 'bg-green-100',
    text: 'text-green-600',
    label: 'Nạp ví',
  },
  wallet_withdraw: {
    icon: 'wallet_withdraw',
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    label: 'Rút ví',
  },
  withdraw_request: {
    icon: 'withdraw_request',
    bg: 'bg-amber-100',
    text: 'text-amber-600',
    label: 'Yêu cầu rút tiền',
  },
  booking: {
    icon: 'booking',
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    label: 'Booking',
  },
  system: {
    icon: 'system',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    label: 'Hệ thống',
  },
  default: {
    icon: 'default',
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    label: 'Thông báo',
  },
};

@Injectable({ providedIn: 'root' })
export class BjNotificationService {
  /** Badge count */
  unreadCount$ = new BehaviorSubject<number>(0);

  constructor(private api: BjApiService) {}

  /**
   * GET /api/notifications
   * @param page - Trang hiện tại
   * @param limit - Số item mỗi trang (tối đa 100)
   * @param isRead - Lọc đã đọc/chưa đọc (null = tất cả)
   * @param type - Lọc theo loại thông báo (null = tất cả)
   */
  getNotifications(
    page: number = 1,
    limit: number = 15,
    isRead?: boolean | null,
    type?: NotificationType | null
  ): Observable<BjNotificationListResponse> {
    let query = `notifications?page=${page}&limit=${limit}`;

    if (isRead !== null && isRead !== undefined) {
      query += `&is_read=${isRead ? '1' : '0'}`;
    }

    if (type) {
      query += `&type=${type}`;
    }

    return (this.api.get(query) as Observable<BjNotificationListResponse>).pipe(
      tap(res => {
        if (res.meta?.unread_count !== undefined) {
          this.unreadCount$.next(res.meta.unread_count);
        }
      })
    );
  }

  /**
   * GET /api/notifications/unread-count
   */
  getUnreadCount(): Observable<BjUnreadCountResponse> {
    return (this.api.get('notifications/unread-count') as Observable<BjUnreadCountResponse>).pipe(
      tap(res => this.unreadCount$.next(res.unread_count))
    );
  }

  /**
   * PATCH /api/notifications/{id}/read
   */
  markAsRead(id: string): Observable<BjMarkReadResponse> {
    return (this.api.patch(`notifications/${id}/read`, {}) as Observable<BjMarkReadResponse>).pipe(
      tap(() => {
        const current = this.unreadCount$.getValue();
        if (current > 0) {
          this.unreadCount$.next(current - 1);
        }
      })
    );
  }

  /**
   * PATCH /api/notifications/read-all
   */
  markAllAsRead(): Observable<BjMarkAllReadResponse> {
    return (this.api.patch('notifications/read-all', {}) as Observable<BjMarkAllReadResponse>).pipe(
      tap(res => this.unreadCount$.next(res.unread_count))
    );
  }

  /**
   * Get config for a notification type
   */
  getTypeConfig(type: NotificationType): NotificationTypeConfig {
    return NOTIFICATION_TYPE_CONFIG[type] || NOTIFICATION_TYPE_CONFIG.default;
  }
}
