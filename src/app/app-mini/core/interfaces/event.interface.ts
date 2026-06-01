/**
 * REALTIME LOCAL SOCIAL (app-mini) — Event interfaces.
 *
 * Gồm hai nhóm:
 *  1) Realtime event contracts (design.md §7) — payload broadcast qua Echo.
 *  2) Domain `EVENTS` (design.md §5.1) cho sự kiện sắp diễn / live (Phase 2).
 *
 * Tách riêng để service realtime (RlsRealtimeService) bind đúng `broadcastAs`.
 */

import { RlsMarkerType } from './marker.interface';
import { RlsPostType } from './post.interface';
import { RlsHeatCategory } from './heat-point.interface';

/* ─────────────────────────────────────────────────────────────────────────
 * 1) REALTIME EVENT CONTRACTS (design.md §7)
 *    Mọi event mang `id` (uuid) cho idempotency phía client (Property 9).
 * ──────────────────────────────────────────────────────────────────────── */

/** Tên broadcast (`broadcastAs`) của các realtime event. */
export type RlsRealtimeEventName =
  | 'NewMarker'
  | 'ActivityCounterUpdated'
  | 'NewFeedItem'
  | 'NotificationReceived'
  | 'EventUpdated';

/** Base cho mọi realtime event — chứa `id` để khử trùng (idempotency). */
export interface RlsRealtimeEvent {
  id: string; // uuid sự kiện
}

/** `.NewMarker` trên `area.{geohash5|6}` (design.md §7.1). */
export interface RlsNewMarkerEvent extends RlsRealtimeEvent {
  markerId: string;
  type: RlsMarkerType;
  lat: number;
  lng: number;
  thumbnailUrl: string;
  label?: string;
  badge?: { kind: 'countdown' | 'count'; value: string };
  createdAt: string; // ISO8601
}

/** `.ActivityCounterUpdated` trên `area.{geohash}` (debounced, design.md §7.1). */
export interface RlsActivityCounterEvent extends RlsRealtimeEvent {
  geohash6: string;
  activeCount: number;
  heatScore: number; // score đã decay
  category: RlsHeatCategory;
}

/** `.NewFeedItem` — bài mới cho local feed khu vực (design.md §7.1). */
export interface RlsNewFeedItemEvent extends RlsRealtimeEvent {
  postId: number;
  type: RlsPostType;
  authorName: string;
  authorAvatar: string;
  thumbnailUrl?: string;
  excerpt: string;
  locationName?: string;
  createdAt: string;
}

/** `.EventUpdated` — countdown / trạng thái sự kiện realtime (design.md §7.4, Phase 2). */
export interface RlsEventUpdatedEvent extends RlsRealtimeEvent {
  eventId: number;
  status: RlsEventStatus;
  startsInSeconds?: number;
  attendeesCount: number;
}

/* ─────────────────────────────────────────────────────────────────────────
 * 2) DOMAIN EVENT (design.md §5.1 EVENTS, §6.8 — Phase 2)
 * ──────────────────────────────────────────────────────────────────────── */

/** Trạng thái sự kiện (design.md §5.1 EVENTS.status). */
export type RlsEventStatus = 'upcoming' | 'live' | 'ended';

/** Sự kiện do community/địa điểm tổ chức. */
export interface RlsEvent {
  id: number;
  locationId: number;
  communityId?: number | null;
  createdBy: number;
  title: string;
  description?: string;
  startsAt: string; // ISO8601
  endsAt?: string;
  status: RlsEventStatus | string;
  attendeesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
