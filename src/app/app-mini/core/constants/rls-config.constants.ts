/**
 * REALTIME LOCAL SOCIAL (app-mini) — Config constants.
 * ─────────────────────────────────────────────────────────────────────────────
 * Hằng số cấu hình lõi cho heatmap, geohash precision, realtime channel,
 * map default. Mirror trọng số & tham số backend (design.md §4.1–§4.4, §3.1)
 * để hàm thuần phía client (`heatmap-score.util`, `geohash.util`, `cluster.util`)
 * cho kết quả nhất quán với server (single source of truth).
 *
 * Prefix `RLS_` để không xung đột với `bro-jet` (`BJ_`) / dự án cũ.
 * Không định nghĩa URL ở đây — dùng `API_URL` từ `environment.ts` (R14.3).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Token lưu trữ Sanctum (mirror cơ chế storage `bro-jet`, R14.4). */
export const RLS_ACCESS_TOKEN_KEY = 'rls_access_token';

/**
 * Trọng số sự kiện cộng vào heat bucket (design.md §4.2).
 * check-in=3, post=2, reaction=1, story=2 — cấu hình được.
 *
 * Mirror ĐÚNG tập trọng số backend (`HeatmapAggregator`, single source of
 * truth) để heat bump optimistic phía client không lệch server. Backend chỉ
 * tính 4 loại sự kiện này vào heat — không thêm loại khác ở client.
 */
export const RLS_HEAT_WEIGHTS = {
  checkin: 3,
  post: 2,
  story: 2,
  reaction: 1,
} as const;

export type RlsHeatEventKind = keyof typeof RLS_HEAT_WEIGHTS;

/**
 * Tham số time-decay của heatmap (design.md §4.2).
 * `λ = ln(2) / halfLife`. Mặc định halfLife = 1800s (30') → sau 30' còn 1/2.
 */
export const RLS_HEAT_DECAY = {
  HALF_LIFE_SECONDS: 1800,
  get LAMBDA(): number {
    return Math.LN2 / this.HALF_LIFE_SECONDS;
  },
} as const;

/** Ngưỡng "very hot" để tô đỏ một ô (design.md §4.3 HOT_THRESHOLD). */
export const RLS_HOT_THRESHOLD = 10;

/**
 * Geohash precision theo mức dùng (design.md §4.1).
 * 4 ≈ 39km, 5 ≈ 4.9km, 6 ≈ 1.2km, 7 ≈ 153m.
 */
export const RLS_GEOHASH_PRECISION = {
  CITY: 4, // heatmap zoom rất xa
  DEFAULT: 5, // kênh realtime mặc định / heatmap city
  AREA: 6, // hot area / heatmap khu vực
  FINE: 7, // cluster marker / nearby mịn
  MIN: 1,
  MAX: 12,
} as const;

/**
 * Chọn geohash precision theo zoom level của bản đồ (design.md R4.5).
 * Zoom thấp → precision thấp (ô lớn), zoom cao → precision cao (ô nhỏ).
 */
export const RLS_ZOOM_PRECISION_BREAKPOINTS: ReadonlyArray<{
  maxZoom: number;
  precision: number;
}> = [
  { maxZoom: 9, precision: 4 },
  { maxZoom: 12, precision: 5 },
  { maxZoom: 15, precision: 6 },
  { maxZoom: 99, precision: 7 },
] as const;

/**
 * Giới hạn realtime channel subscription theo viewport (design.md §3.1).
 * Vượt MAX_CELLS → hạ precision (giảm số ô phủ viewport).
 */
export const RLS_REALTIME = {
  MAX_VIEWPORT_CELLS: 12,
  /** Cửa sổ debounce broadcast activity counter (ms) (design.md §3.3). */
  ACTIVITY_DEBOUNCE_MS: 1000,
  /** Sức chứa LRU set khử trùng event đã xử lý (idempotency, Property 9). */
  IDEMPOTENCY_LRU_SIZE: 500,
} as const;

/**
 * Mô hình tên kênh Reverb (design.md §3.1) — builder thuần, không hardcode chuỗi
 * kênh rải rác trong service. Kênh `area.*` / `presence-area.*` chỉ mang geohash
 * thô (coarse) — KHÔNG bao giờ chứa toạ độ raw của user (R16.3).
 *
 * - `area.{geohash}`            public  — live marker/feed/counter theo ô (R12.1)
 * - `presence-area.{geohash5}`  presence — đếm người đang ở khu vực
 * - `private-user.{userId}`     private — notification riêng (R9.2, R9.3)
 * - `community.{communityId}`   public  — feed/trend cộng đồng (Phase 2)
 * - `event.{eventId}`           public  — countdown sự kiện (Phase 2)
 */
export const RLS_CHANNELS = {
  /** Kênh khu vực public theo ô geohash phủ viewport (precision 5 mặc định, 6 khi zoom sâu). */
  area: (geohash: string) => `area.${geohash}`,
  /** Kênh presence đếm người ở khu vực (geohash precision 5). */
  presenceArea: (geohash5: string) => `presence-area.${geohash5}`,
  /** Kênh private notification của user hiện tại — auth qua Sanctum tại `/api/broadcasting/auth`. */
  privateUser: (userId: number | string) => `private-user.${userId}`,
  /** Kênh cộng đồng (Phase 2). */
  community: (communityId: number | string) => `community.${communityId}`,
  /** Kênh sự kiện realtime (Phase 2). */
  event: (eventId: number | string) => `event.${eventId}`,
} as const;

/** Vòng đời story 24h (design.md §6.6, §11.5 — Property 5). */
export const RLS_STORY_TTL_MS = 24 * 60 * 60 * 1000;

/** Tham số map mặc định (fallback khi từ chối quyền vị trí — R2.3). */
export const RLS_MAP = {
  DEFAULT_ZOOM: 13,
  DEFAULT_LAT: 21.0285, // Hà Nội
  DEFAULT_LNG: 105.8542,
  MAP_CONTAINER_ID: 'rlsMapContainer',
  /** Debounce refetch khi pan/zoom (ms) (design.md R2.6). */
  VIEWPORT_DEBOUNCE_MS: 300,
  /** Cap số marker trả về ở khu vực dày (design.md R2.5, R16.2). */
  MAX_MARKERS: 300,
  /** Kích thước ô lưới (px) để gom cluster ở zoom thấp (design.md §11.6). */
  CLUSTER_GRID_SIZE: 60,
} as const;

/** Bán kính mặc định cho truy vấn nearby (m) (design.md §6.5). */
export const RLS_DEFAULT_RADIUS_M = 2000;

/** API endpoint paths (design.md §6) — host lấy từ `API_URL` (environment.ts). */
export const RLS_API = {
  // Auth
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  PHONE_OTP_REQUEST: '/auth/phone/request-otp',
  PHONE_OTP_VERIFY: '/auth/phone/verify-otp',
  PHONE_PROFILE_COMPLETE: '/auth/phone/complete-profile',
  GOOGLE: '/auth/google',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  FCM_TOKEN: '/auth/fcm-token',
  // Realtime — private/presence channel authorization (Sanctum) (design.md §15.2, R9.3)
  BROADCASTING_AUTH: '/broadcasting/auth',
  // Map & Geospatial
  MAP_SNAPSHOT: '/map/snapshot',
  MAP_BOOTSTRAP: '/map/bootstrap',
  MAP_HEATMAP: '/map/heatmap',
  MAP_MARKERS: '/map/markers',
  MAP_NEARBY: '/map/nearby',        // GET /api/map/nearby (public)
  MAP_HOT_AREAS: '/map/hot-areas',
  // Locations
  LOCATIONS: '/locations',
  LOCATION_DETAIL: '/locations/:id',
  LOCATION_FEED: '/locations/:id/feed',
  // Feed / Posts
  FEED: '/feed',
  POSTS: '/posts',
  POST_DETAIL: '/posts/:id',
  POST_REACTIONS: '/posts/:id/reactions',
  POST_COMMENTS: '/posts/:id/comments',
  // Social graph
  FRIEND_SUGGESTIONS: '/friends/suggestions',
  FRIEND_CONTACT_IMPORT: '/friends/contacts/import',
  FRIEND_REQUEST: '/friends/:id/request',
  FRIEND_REQUESTS: '/friends/requests',
  FRIEND_REQUEST_ACCEPT: '/friends/requests/:id/accept',
  // Check-ins
  CHECKINS: '/checkins',
  CHECKINS_ME: '/checkins/me',
  // Stories
  STORIES: '/stories',
  STORIES_NEARBY: '/stories/nearby',
  STORIES_MAP: '/stories/map',
  STORY_DETAIL: '/stories/:id',
  // Trending
  TRENDING_NEARBY: '/trending/nearby',
  TRENDING_PLACES: '/trending/places',
  // Notifications
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_READ: '/notifications/:id/read',
  NOTIFICATIONS_READ_ALL: '/notifications/read-all',
} as const;
