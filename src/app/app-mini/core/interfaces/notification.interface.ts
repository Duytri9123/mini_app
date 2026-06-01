/**
 * REALTIME LOCAL SOCIAL (app-mini) — Notification interfaces.
 *
 * Ánh xạ model `NOTIFICATIONS` (design.md §5.1), inbox (`GET /notifications`,
 * design.md §6.9) và realtime `.NotificationReceived` trên
 * `private-user.{userId}` (design.md §7.3).
 */

import { RlsRealtimeEvent } from './event.interface';

/** Loại notification (design.md §5.1 NOTIFICATIONS.type / §7.3). */
export type RlsNotificationType =
  | 'hot_area'
  | 'friend_checkin'
  | 'nearby_event'
  | 'trending';

/** Notification đã lưu (inbox). */
export interface RlsNotification {
  id: number;
  userId: number; // recipient
  type: RlsNotificationType | string;
  title?: string;
  body?: string;
  data: Record<string, unknown>; // deep-link payload (locationId, eventId...)
  geohash6?: string | null;
  isRead: boolean;
  createdAt: string; // ISO8601
}

/**
 * `.NotificationReceived` — payload realtime (design.md §7.3).
 * Khác `RlsNotification` ở chỗ chưa có `isRead`/`userId` (đến qua kênh riêng).
 */
export interface RlsNotificationEvent extends RlsRealtimeEvent {
  type: RlsNotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  createdAt: string;
}

/** Tham số inbox cursor pagination. */
export interface RlsNotificationsQuery {
  cursor?: string | null;
  limit?: number;
}
