/**
 * REALTIME LOCAL SOCIAL (app-mini) — Story interfaces.
 *
 * Ánh xạ model `STORIES` (design.md §5.1) + story 24h (design.md §6.6, §11.5).
 * Bất biến: `expiresAt === createdAt + 24h`; story active ⟺ now < expiresAt
 * và status === 'active' (xem `story-expiry.util.ts`, Property 5).
 */

import { RlsRealtimeEvent } from './event.interface';

/** Loại media của story. */
export type RlsStoryMediaType = 'image' | 'video';

/** Trạng thái vòng đời story (design.md §5.1 STORIES.status). */
export type RlsStoryStatus = 'active' | 'expired' | 'removed';

/** Story ephemeral 24h. */
export interface RlsStory {
  id: number;
  userId: number;
  authorName?: string;
  authorAvatar?: string | null;
  locationId?: number | null;
  mediaUrl: string;
  mediaType: RlsStoryMediaType;
  lat: number;
  lng: number;
  geohash6?: string;
  status: RlsStoryStatus | string;
  /** ISO8601 — luôn = createdAt + 24h (bất biến §11.5). */
  expiresAt: string;
  createdAt: string;
  /** Đã xem hay chưa (phục vụ story ring "seen state"). */
  seen?: boolean;
}

/** Tham số truy vấn story gần đang còn hiệu lực (`GET /stories/nearby`). */
export interface RlsNearbyStoriesQuery {
  lat: number;
  lng: number;
  radiusM: number;
}

/** Tham số truy vấn story trên bản đồ theo viewport (`GET /stories/map?bbox=`). */
export interface RlsStoryMapQuery {
  /** "minLng,minLat,maxLng,maxLat" (khớp định dạng bbox của marker). */
  bbox: string;
}

/** Payload đăng story mới (expiresAt do backend set +24h). */
export interface RlsCreateStoryRequest {
  mediaUrl: string;
  mediaType: RlsStoryMediaType;
  lat: number;
  lng: number;
  locationId?: number | null;
}

/* ─────────────────────────────────────────────────────────────────────────
 * REALTIME STORY DELTAS (design.md §6.7 R8.5)
 *
 * Khi một story hết hạn server-side (job `ExpireStories`) hoặc một story mới
 * được tạo, backend broadcast một delta để mọi client hội tụ (converge) về cùng
 * trạng thái. Mỗi event mang `id` (uuid) để khử trùng phía client (Property 9).
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * `.StoryExpired` — story đã hết hạn server-side (broadcastAs `story.expired`).
 * Client gỡ story tương ứng khỏi state cục bộ (R8.5) để hội tụ với server.
 */
export interface RlsStoryExpiredEvent extends RlsRealtimeEvent {
  storyId: number;
  /** Geohash thô của story (không mang toạ độ raw trên kênh public — R16.3). */
  geohash6?: string;
}

/**
 * `.StoryCreated` — story mới xuất hiện (broadcastAs `story.created`).
 * Payload mỏng đủ để render pin/ring; client merge vào state cục bộ (R8.5).
 */
export interface RlsStoryCreatedEvent extends RlsRealtimeEvent {
  storyId: number;
  userId: number;
  authorName?: string;
  authorAvatar?: string | null;
  mediaUrl: string;
  mediaType: RlsStoryMediaType;
  lat: number;
  lng: number;
  geohash6?: string;
  expiresAt: string;
  createdAt: string;
}
