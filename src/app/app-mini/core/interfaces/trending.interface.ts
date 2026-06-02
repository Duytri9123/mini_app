/**
 * REALTIME LOCAL SOCIAL (app-mini) — Trending interfaces.
 *
 * Ánh xạ kết quả trending (`GET /trending/nearby`, `GET /trending/places`,
 * design.md §6.5) do `RankingService` backend tính sẵn (cached). Mỗi spot được
 * gắn **một lý do** (crowded/viral/event/rising) theo R6.4 — đây là single source
 * of truth cho `RlsTrendingService` (task 3.9) và `RlsTrendingPanelComponent` /
 * `RlsTrendingCardComponent` (design.md §9.3).
 *
 * Prefix `Rls` để không xung đột với `bro-jet` (`Bj`) / dự án cũ.
 */

import { RlsLocation } from './location.interface';

/**
 * Lý do một địa điểm đang trending (design.md §6.5, R6.4).
 * - `crowded` — đông người check-in/hoạt động gần đây.
 * - `viral`   — nội dung lan truyền (reaction/comment tăng vọt).
 * - `event`   — đang/ sắp có sự kiện.
 * - `rising`  — score đang tăng nhanh so với trước.
 */
export type RlsTrendingReason = 'crowded' | 'viral' | 'event' | 'rising';

/** Tác giả tối giản trong bài post trending. */
export interface RlsTrendingPostAuthor {
  id: number;
  name: string;
  username: string;
  avatarUrl?: string | null;
}

/** Bài post trending tại một địa điểm (từ TrendingController). */
export interface RlsTrendingPost {
  id: number;
  content: string;
  reactionsCount: number;
  commentsCount: number;
  /** URL ảnh đầu tiên nếu có. */
  media?: string | null;
  author?: RlsTrendingPostAuthor | null;
  createdAt: string;
}

/** Người dùng đang active tại địa điểm. */
export interface RlsActiveUser {
  id?: number;
  name?: string;
  username?: string;
  avatarUrl?: string | null;
}

/**
 * Một spot trending (mở rộng {@link RlsLocation}) — đơn vị render của
 * `RlsTrendingPanelComponent` (`@Input items`) và `RlsTrendingCardComponent`.
 * Backend annotate sẵn `reason` + (tuỳ chọn) `rank`/`trendScore` để client chỉ
 * hiển thị, không tự tính (single source of truth).
 */
export interface RlsTrendingPlace extends RlsLocation {
  /** Lý do trending (bắt buộc theo R6.4). */
  reason: RlsTrendingReason;
  /** Nhãn hiển thị do backend trả (tuỳ chọn) — fallback map ở client nếu thiếu. */
  reasonLabel?: string;
  /** Nhãn lý do từ TrendingController (vd "5 người đang ở đây"). */
  reason_label?: string;
  /** Thứ hạng trong danh sách (1-based, tuỳ chọn). */
  rank?: number;
  /** Score xếp hạng đã decay (tuỳ chọn) — chỉ để hiển thị/ debug. */
  trendScore?: number;
  /** Bài post trending mới nhất tại địa điểm này. */
  trendingPost?: RlsTrendingPost | null;
  /** Người dùng đang active (check-in gần đây). */
  activeUsers?: RlsActiveUser[];
  /** Số người đang active. */
  activeCount?: number;
  /** Thời gian tương đối của hoạt động gần nhất (vd "2m ago"). */
  timeAgo?: string | null;
}

/**
 * Tham số truy vấn **hot/viral spots gần bạn** (`GET /trending/nearby?lat=&lng=`,
 * design.md §6.7, R6.1). `radiusM`/`limit` tuỳ chọn — backend đã tính sẵn danh
 * sách (cached `RankingService`) nên client chỉ truyền tâm để lấy kết quả gần.
 */
export interface RlsTrendingNearbyQuery {
  lat: number;
  lng: number;
  /** Bán kính tìm (m) — tuỳ chọn; backend tự áp mặc định nếu thiếu. */
  radiusM?: number;
  /** Giới hạn số spot trả về — tuỳ chọn. */
  limit?: number;
}

/**
 * Tham số truy vấn **top hot places** (`GET /trending/places?scope=`,
 * design.md §6.7, R11.2). `scope` chọn phạm vi xếp hạng (vd `area`/`city`/
 * geohash...) — để mở vì backend là single source of truth cho tập scope.
 */
export interface RlsTrendingPlacesQuery {
  /** Phạm vi xếp hạng (vd `area`, `city`, geohash...). Tuỳ chọn. */
  scope?: string;
  /** Tham chiếu phạm vi (geohash/communityId...) khi `scope` cần — tuỳ chọn. */
  ref?: string | number;
  /** Giới hạn số place trả về — tuỳ chọn. */
  limit?: number;
}
