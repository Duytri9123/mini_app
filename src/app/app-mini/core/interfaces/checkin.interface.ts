/**
 * REALTIME LOCAL SOCIAL (app-mini) — Check-in interfaces.
 *
 * Ánh xạ model `CHECKINS` (design.md §5.1) và payload tạo check-in
 * (`POST /checkins`, design.md §6.5). Check-in làm tăng heat của ô geohash +
 * phát broadcast (`BroadcastCheckin`/`UpdateRankings`/`SendNearbyPush`) ở backend;
 * client chỉ gửi toạ độ + địa điểm và nhận lại bản ghi đã tạo.
 *
 * Prefix `Rls` để không xung đột với `bro-jet` (`Bj`).
 */

/** Một lần check-in tại địa điểm (single source of truth ở backend). */
export interface RlsCheckin {
  id: number;
  userId: number;
  locationId: number;
  /** Sự kiện liên quan (nếu check-in tại 1 event). */
  eventId?: number | null;
  lat: number;
  lng: number;
  geohash6?: string;
  /** Độ chính xác định vị (m) — backend lưu để lọc nhiễu. */
  accuracyM?: number;
  createdAt: string; // ISO8601
}

/** Payload tạo check-in mới (`POST /checkins`). */
export interface RlsCreateCheckinRequest {
  locationId: number;
  lat: number;
  lng: number;
  eventId?: number | null;
  accuracyM?: number;
}
