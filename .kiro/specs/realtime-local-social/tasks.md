# Implementation Plan: Realtime Local Social Platform (`realtime-local-social`)

## Overview

Kế hoạch này chuyển thiết kế (`design.md`) thành chuỗi nhiệm vụ code tăng tiến cho **hai project**:

- **Backend admin/API** — Laravel greenfield tại `c:\My BACKEND\Mini_admin` (Sanctum, Reverb, Queue/Redis, Firebase push, Filament dashboard).
- **App người dùng** — Ionic Angular trong module mới `c:\My BACKEND\Mini_app\src\app\app-mini`, mirror cấu trúc `bro-jet` (core/shared/layout/pages/features/tests), Tailwind v4, Leaflet + markercluster, laravel-echo + pusher-js, fast-check cho PBT.

Trọng tâm là **Phase 1 (MVP)**: bản đồ realtime + local feed + tương tác marker, kèm auth, check-in, story 24h, notification realtime và dashboard admin nền tảng. Các hạng mục Phase 2/3 được đặt cuối, đánh dấu tùy chọn.

Thứ tự nhiệm vụ theo phụ thuộc: nền tảng backend → service lõi → REST API → realtime (Reverb) → Filament admin → frontend (scaffold + routing + interceptor + core services → pure utils → components Tailwind → pages → wiring realtime) → property-based tests cho các hàm thuần (geohash, heatmap-score, distance, cluster, story-expiry, ranking).

Quy ước: tiêu đề/mô tả bằng tiếng Việt; định danh code (tên class/hàm/file) giữ tiếng Anh. Sub-task gắn hậu tố `*` là **tùy chọn** (test) và sẽ KHÔNG được thực thi tự động.

> Tham chiếu requirement dùng định dạng `_Requirements: X.Y_` (theo `requirements.md`). Tham chiếu property dùng `**Property N**` (theo mục Correctness Properties trong `design.md`).

---

## Tasks

- [ ] 1. Khởi tạo backend Laravel (Mini_admin) và cấu hình hạ tầng
  - [x] 1.1 Tạo project Laravel greenfield + cài dependencies
    - `composer create-project laravel/laravel` tại `c:\My BACKEND\Mini_admin`
    - Cài `laravel/sanctum`, `laravel/reverb`, `spatie/laravel-permission`, `filament/filament`, `predis/predis`, `kreait/laravel-firebase`, `pestphp/pest`
    - Tạo `.env` (DB, `REDIS_*`, `REVERB_*`, `BROADCAST_DRIVER=reverb`, `QUEUE_CONNECTION=redis`, `CACHE_DRIVER=redis`, `FIREBASE_*`)
    - _Requirements: 14.3, 16.4_
    - _Design: 16.1 Dependencies (Backend)_
  - [-] 1.2 Cấu hình Sanctum, Reverb, broadcasting, Redis và CORS
    - Publish + cấu hình `config/sanctum.php`, `config/reverb.php`, `config/broadcasting.php`, `config/cors.php`
    - Bật `auth:sanctum` guard; cấu hình CORS khớp admin host (TLS) cho API + WebSocket
    - Khai báo route `/api/broadcasting/auth` bảo vệ bằng Sanctum
    - _Requirements: 1.4, 9.3, 16.4_
    - _Design: 3 Realtime Architecture, 15.2 Security_

- [ ] 2. Lược đồ dữ liệu, models và observers tính geohash
  - [-] 2.1 Viết migrations cho toàn bộ bảng
    - Tạo migrations: `users`, `locations`, `posts`, `stories`, `checkins`, `reactions`, `comments`, `notifications`, `communities`, `events`, `reports`
    - Thêm cột `geohash5`/`geohash6`, `lat`/`lng`, cột spatial (`geom`) và các index theo chiến lược index (composite `(geohash6, created_at DESC)`, partial index story `expires_at`, unique reaction)
    - _Requirements: 4.1, 5.1, 8.1, 16.2_
    - _Design: 5.1 ER Diagram, 5.2 Index strategy_
  - [ ] 2.2 Định nghĩa Eloquent models + quan hệ
    - Tạo models tương ứng với khai báo quan hệ (User, Location, Post, Story, Checkin, Reaction, Comment, Notification, Community, Event, Report)
    - Khai báo fillable/casts, soft-delete cho nội dung kiểm duyệt
    - _Requirements: 5.1, 13.3_
    - _Design: 5.1 ER Diagram, 10.1 Cấu trúc backend_
  - [ ] 2.3 Tạo Observers tính geohash khi lưu
    - `LocationObserver`, `PostObserver`, `CheckinObserver`, `StoryObserver` tính `geohash5`/`geohash6` từ `lat,lng`; `StoryObserver` set `expires_at = created_at + 24h`
    - _Requirements: 4.1, 8.1_
    - _Design: 5.2 (ghi chú geohash app-layer), 11.5 Story expiry_
  - [ ]* 2.4 Viết unit test cho observers (tính geohash + expires_at)
    - Kiểm tra observer set đúng geohash và `expires_at = created_at + 24h`
    - _Requirements: 4.1, 8.1_

- [ ] 3. Xác thực Sanctum và phân quyền (RBAC)
  - [ ] 3.1 Cài đặt spatie/laravel-permission + seeder roles/permissions
    - Migrate permission tables; seeder tạo role `user`/`moderator`/`admin` và permission moderation
    - _Requirements: 1.7, 13.1_
    - _Design: 8 Roles & Permissions_
  - [ ] 3.2 Viết AuthController + FormRequests
    - Endpoint `POST /auth/register`, `POST /auth/login`, `POST /auth/google`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/fcm-token`
    - Trả Sanctum token; validate qua FormRequest (422 nếu sai); lưu fcm_token
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 9.4_
    - _Design: 6.1 Auth_
  - [ ] 3.3 Viết Policies và Gates
    - `PostPolicy`, `StoryPolicy`, `CheckinPolicy`, `CommentPolicy` (ownership); Gate `moderate` cho moderator/admin
    - Áp dụng "mọi route ghi đều qua policy/gate"
    - _Requirements: 1.7, 5.5, 13.1, 13.3_
    - _Design: 8.2 Permission invariants_
  - [ ]* 3.4 Viết feature test cho auth + role gates (Property 8)
    - **Property 8: Permission invariants** (ownership + privilege monotonicity)
    - **Validates: Requirements 1.7, 13.1**

- [ ] 4. Service lõi backend (geospatial, heatmap, ranking)
  - [ ] 4.1 Triển khai GeohashService
    - `encode(lat,lng,precision)`, `bounds(hash)`, `coverBbox(bbox,precision,maxCells)` theo thuật toán LLD
    - _Requirements: 4.1, 4.5, 2.5_
    - _Design: 11.1 GeohashService_
  - [ ] 4.2 Triển khai HeatmapAggregator (incremental time-decay)
    - `addEvent`, `readScore`, `dominantCategory`, `hotBuckets` lưu `(score, refTs)` + sub-score category trong Redis; `λ = ln(2)/halfLife`; đảm bảo đúng một cell cho mỗi cặp (geohash, category)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_
    - _Design: 4.2 Heatmap score, 11.2 HeatmapAggregator_
  - [ ] 4.3 Triển khai GeospatialQueryService (nearby)
    - `nearby(lat,lng,radiusM,types,limit)`: bbox prefilter → lọc khoảng cách chính xác → sort tăng theo distance
    - _Requirements: 6.1, 6.2, 6.3_
    - _Design: 4.4, 11.3 GeospatialQueryService_
  - [ ] 4.4 Triển khai RankingService + RecommendationService (stub Phase 1)
    - `RankingService.nearbyTrending` (đọc Redis sorted set + annotate reason); `RecommendationService.dailySuggestion` fallback về nearbyTrending
    - _Requirements: 6.4, 10.1, 10.5, 11.1, 11.2_
    - _Design: 4.4 hot areas, 11.7 Recommendation stub_
  - [ ]* 4.5 Viết PBT backend cho geohash, heatmap, nearby (Pest)
    - **Property 1: Heatmap đơn điệu time-decay**, **Property 2: add giao hoán & cộng tính**, **Property 3: Geohash containment + prefix**, **Property 6: Nearby distance correctness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5, 6.1, 6.2, 6.3**

- [ ] 5. Checkpoint — đảm bảo service lõi backend pass test
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. REST API endpoints (Sanctum guarded)
  - [ ] 6.1 Map & Geospatial endpoints + Redis cache
    - `GET /map/snapshot|bootstrap`, `/map/heatmap`, `/map/markers`, `/map/nearby`, `/map/hot-areas`; đọc Redis aggregate, chỉ query DB khi cache miss; cap result + cluster theo geohash prefix ở zoom thấp; chỉ trả item trong bbox
    - _Requirements: 2.2, 2.5, 4.5, 16.1, 16.2_
    - _Design: 6.2 Map & Geospatial, 15.1 Performance_
  - [ ] 6.2 Locations endpoints + API Resources
    - `GET /locations/{id}`, `/locations/{id}/feed`, `POST/PUT/DELETE /locations` (mod/admin); chuẩn hóa response `{data, meta?}`
    - _Requirements: 2.4, 13.4_
    - _Design: 6.3 Locations_
  - [ ] 6.3 Feed, Posts, Reactions, Comments + rate limiting
    - `GET /feed` (cursor, scope area|community|location), `POST/GET/DELETE /posts`, `POST/DELETE /posts/{id}/reactions` (1 reaction/user/target), `GET/POST /posts/{id}/comments`; throttle chống spam; validate lat/lng + sanitize media
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 16.5_
    - _Design: 6.4 Feed & Posts, 15.2 Security_
  - [ ] 6.4 Check-ins endpoints
    - `POST /checkins` (transaction → tăng heat bucket → dispatch jobs broadcast/push), `GET /checkins/me`
    - _Requirements: 4.6, 5.3, 16.5_
    - _Design: 6.5 Check-ins, 11.4 Realtime broadcast flow_
  - [ ] 6.5 Stories endpoints
    - `POST /stories` (expires_at +24h), `GET /stories/nearby` (chỉ active trong radius), `GET /stories/map`, `GET /stories/{id}`
    - _Requirements: 8.1, 8.2, 8.3, 8.6_
    - _Design: 6.6 Stories, 11.5 Story expiry_
  - [ ] 6.6 Trending endpoints
    - `GET /trending/nearby`, `GET /trending/places` đọc kết quả ranking đã cache; annotate reason (crowded/viral/event/rising)
    - _Requirements: 6.1, 6.4, 6.5, 11.2_
    - _Design: 6.7 Trending & Ranking_
  - [ ] 6.7 Notifications endpoints
    - `GET /notifications` (cursor), `POST /notifications/{id}/read`, `POST /notifications/read-all`; persist read state
    - _Requirements: 9.1, 9.5_
    - _Design: 6.9 Notifications_
  - [ ]* 6.8 Viết feature test cho API endpoints (auth/ownership/role + validation)
    - Test 422 validation, 401, ownership, role gate, cursor pagination
    - _Requirements: 1.3, 1.5, 5.5, 5.6, 15.4, 16.5_

- [ ] 7. Realtime (Reverb): events, channels, jobs, scheduler, push
  - [ ] 7.1 Định nghĩa broadcast events
    - `NewMarker`, `ActivityCounterUpdated`, `NewFeedItem`, `NotificationReceived` với `broadcastAs` + payload theo contract; mỗi event mang `id` (uuid) cho idempotency; chỉ phát coarse geohash (không lộ tọa độ raw)
    - _Requirements: 3.6, 4.7, 5.4, 9.2, 16.3_
    - _Design: 7 Realtime Event Contracts_
  - [ ] 7.2 Khai báo channels + authorization
    - `area.{geohash5/6}`, `presence-area.{geohash5}`, `private-user.{userId}`; auth presence/private qua Sanctum tại `/api/broadcasting/auth`
    - _Requirements: 9.2, 9.3, 12.1, 16.3_
    - _Design: 3.1 Mô hình kênh, 8 Roles_
  - [ ] 7.3 Triển khai event-driven jobs
    - `BroadcastCheckin`, `FanoutFeed`, `UpdateRankings`, `SendNearbyPush`; broadcast CHỈ từ queue job (không từ request thread); debounce activity counter
    - _Requirements: 5.3, 9.1, 12.5_
    - _Design: 3.2 Luồng broadcast, 10.3 Scheduler & Queue_
  - [ ] 7.4 Triển khai scheduled jobs + scheduler
    - `ExpireStories` (mỗi 5'): đổi story active quá hạn → expired và broadcast `story.expired`; `RecomputeHeatmapDecay` (mỗi 1'); đăng ký trong `Kernel`
    - _Requirements: 6.5, 8.4, 8.5_
    - _Design: 10.3 Scheduler, 11.5 ExpireStories_
  - [ ] 7.5 Tích hợp Firebase FCM push
    - `SendNearbyPush` gửi FCM cho user opted-in theo loại notification; lưu/dùng fcm_token
    - _Requirements: 9.4_
    - _Design: 6.9, 10.3_
  - [ ]* 7.6 Viết feature test realtime (Event::fake) + job dispatched
    - Assert broadcast đúng kênh khi check-in/post; assert fan-out/aggregation job được dispatch; broadcast không chạy ở request thread
    - _Requirements: 9.2, 12.5, 15.4_

- [ ] 8. Checkpoint — đảm bảo API + realtime backend pass test
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Filament admin dashboard (Mini_admin)
  - [ ] 9.1 Cấu hình Filament panel + giới hạn truy cập role
    - Panel chỉ cho `moderator`/`admin`; tích hợp spatie permission
    - _Requirements: 13.1_
    - _Design: 10 Admin Dashboard Design_
  - [ ] 9.2 Tạo Filament Resources
    - `UserResource`, `PostResource`, `LocationResource`, `CommunityResource`, `EventResource`, `ReportResource`
    - _Requirements: 13.4_
    - _Design: 10.1, 10.2 Module dashboard_
  - [ ] 9.3 Moderation Queue + luồng xử lý report
    - Trang `ModerationQueue`: tạo report status `open`; hide/remove → soft-delete + resolve report + audit
    - _Requirements: 13.2, 13.3_
    - _Design: 10.2 Moderation Queue_
  - [ ] 9.4 Analytics widgets
    - `ActiveUsersWidget`, `HotAreasWidget`, `TrendingPlacesWidget`, `ReportsBacklogWidget`
    - _Requirements: 13.4_
    - _Design: 10.1 Widgets_
  - [ ]* 9.5 Viết feature test kiểm soát truy cập admin
    - User thường bị 403; moderator/admin truy cập được; resolve report cập nhật trạng thái
    - _Requirements: 13.1, 13.2, 13.3_

- [ ] 10. Scaffold module `app-mini` + đăng ký routing + interceptor
  - [x] 10.1 Tạo module + routing và đăng ký lazy route
    - Tạo `app-mini.module.ts`, `app-mini-routing.module.ts` + cây thư mục mirror `bro-jet` (core/shared/layout/pages/features/tests)
    - Thêm route `{ path: 'app-mini', loadChildren: ... }` vào `src/app/app-routing.module.ts` SONG SONG `gap-move`/`bro-jet` (giữ `redirectTo: 'gap-move'`, không phá route cũ)
    - _Requirements: 14.1, 14.2_
    - _Design: 9.1 Tích hợp routing, 9.2 Cấu trúc thư mục_
  - [-] 10.2 Định nghĩa interfaces + constants
    - `core/interfaces/`: location, post, story, marker, heat-point, event, notification, map-marker, cluster; `core/constants/rls-config.constants.ts` (heat weights, geohash precision)
    - _Requirements: 14.1_
    - _Design: 9.2, 7 Event Contracts_
  - [-] 10.3 Triển khai RlsAuthInterceptor + đăng ký trong module
    - Mirror `BjAuthInterceptor`: gắn `Authorization: Bearer <rls_access_token>`; xử lý 401 (xóa token, chỉ redirect `/app-mini/login` khi ở route protected); provide `HTTP_INTERCEPTORS` scope theo module (multi:true), không ảnh hưởng `gap-move`/`bro-jet`
    - _Requirements: 1.4, 1.5, 14.4_
    - _Design: 9.5 Auth interceptor_

- [ ] 11. Core services frontend (`app-mini/core/services`)
  - [ ] 11.1 RlsApiService + RlsAuthService
    - `RlsApiService` mirror `BjApiService`, dùng `API_URL` từ `environment.ts`; `RlsAuthService` login/register/google, lưu token `rls_access_token`, `currentUser$`
    - _Requirements: 1.1, 1.2, 1.6, 14.3, 14.4_
    - _Design: 9.4 Core services_
  - [ ] 11.2 RlsRealtimeService (laravel-echo + pusher-js)
    - Khởi tạo Echo cấu hình Reverb/Pusher; subscribe/unsubscribe kênh theo viewport (diff); LRU set chống render trùng (idempotency)
    - _Requirements: 12.1, 12.2, 14.6_
    - _Design: 3.3, 9.4 RlsRealtimeService_
  - [ ] 11.3 RlsGeolocationService + RlsMapService
    - Wrapper `@capacitor/geolocation` (watch + permission); `RlsMapService` giữ state center/zoom/bbox/markers/heat bằng `BehaviorSubject` (mirror `BjMapService`)
    - _Requirements: 2.1, 2.3, 2.6_
    - _Design: 9.4, 9.6 Luồng khởi động_
  - [ ] 11.4 RlsFeedService, RlsStoryService, RlsNotificationService, RlsTrendingService, RlsToastService
    - Feed cursor + merge realtime; Story đăng/tải + lọc hết hạn client; Notification inbox + realtime; Trending nearby/hot; Toast feedback
    - _Requirements: 5.1, 5.4, 8.3, 9.1, 9.5, 6.1_
    - _Design: 9.4 Core services_

- [ ] 12. Hàm thuần (`app-mini/core/utils`) cho property-based testing
  - [-] 12.1 Triển khai `geohash.util.ts`
    - `encode(lat,lng,precision)`, `bounds(hash)`, `coverBbox(bbox,precision,maxCells)` (thuần, không side-effect)
    - _Requirements: 4.1, 4.5, 2.5, 15.1_
    - _Design: 11.1 GeohashService, 13 Property 3 & 4_
  - [-] 12.2 Triển khai `distance.util.ts`
    - `haversine(lat1,lng1,lat2,lng2)` + `filterWithinRadius(center, points, radiusM)` (non-negative, symmetric)
    - _Requirements: 6.2, 6.3, 15.1_
    - _Design: 11.3, 13 Property 6_
  - [-] 12.3 Triển khai `heatmap-score.util.ts`
    - `addEvent(state, weight, now)` + `readScore(state, now)` incremental decay thuần (mirror logic backend)
    - _Requirements: 4.2, 4.3, 4.6, 15.1_
    - _Design: 4.2, 11.2, 13 Property 1 & 2_
  - [-] 12.4 Triển khai `cluster.util.ts`
    - `clusterMarkers(markers, zoom, gridSize)` phân hoạch theo grid, bảo toàn tổng count
    - _Requirements: 3.4, 15.1_
    - _Design: 11.6, 13 Property 7_
  - [-] 12.5 Triển khai `story-expiry.util.ts`
    - `computeExpiresAt(createdAt)` (+24h) + `isStoryActive(story, now)` thuần
    - _Requirements: 8.1, 8.2, 8.4, 15.1_
    - _Design: 11.5, 13 Property 5_
  - [-] 12.6 Triển khai `ranking.util.ts`
    - `rankRecommendations(candidates, ctx)`: permutation của candidate set, sort theo score desc + tie-break ổn định trên `locationId`, deterministic
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 11.2, 15.1_
    - _Design: 11.7, 6.9_
  - [-] 12.7 Triển khai `idempotency.util.ts`
    - LRU set + `applyOnce(state, eventId, reducer)` đảm bảo áp dụng nhiều lần == một lần
    - _Requirements: 3.6, 5.4, 12.4, 15.1_
    - _Design: 3.3, 13 Property 9_

- [ ] 13. Property-based tests (fast-check) trong `app-mini/tests`
  - [ ]* 13.1 PBT cho geohash.util
    - **Property 3: Geohash bucket containment + prefix monotonicity**, **Property 4: Viewport cover phủ kín**
    - Mỗi property test ghi rõ requirement nó xác thực (theo convention `bro-jet/tests`)
    - **Validates: Requirements 4.1, 4.5, 2.5, 12.1, 15.2, 15.3**
  - [ ]* 13.2 PBT cho distance.util
    - **Property 6: Nearby distance correctness** (soundness/sortedness/completeness, non-negative, symmetric)
    - **Validates: Requirements 6.1, 6.2, 6.3**
  - [ ]* 13.3 PBT cho heatmap-score.util
    - **Property 1: đơn điệu time-decay (>=0)**, **Property 2: add giao hoán & cộng tính**
    - **Validates: Requirements 4.2, 4.3, 4.6, 4.1**
  - [ ]* 13.4 PBT cho cluster.util
    - **Property 7: clustering bảo toàn số lượng & phân hoạch**
    - **Validates: Requirements 3.4**
  - [ ]* 13.5 PBT cho story-expiry.util
    - **Property 5: Story expiry invariants**
    - **Validates: Requirements 8.1, 8.2, 8.4**
  - [ ]* 13.6 PBT cho ranking.util
    - Ranking là permutation; sort desc + tie-break ổn định; deterministic
    - **Validates: Requirements 10.2, 10.3, 10.4**
  - [ ]* 13.7 PBT cho idempotency.util
    - **Property 9: Realtime idempotency** (áp dụng n lần == 1 lần)
    - **Validates: Requirements 3.6, 5.4, 12.4**

- [ ] 14. Checkpoint — đảm bảo utils + PBT frontend pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Components Tailwind v4 nhỏ + layout + pipes
  - [ ] 15.1 Components bản đồ (map/marker/heat)
    - `RlsMapMarkerComponent`, `RlsHeatLayerComponent`, `RlsMarkerClusterComponent`, `RlsActivityCounterComponent`, `RlsNeonBadgeComponent` (dùng `cluster.util`/`heatmap-score.util`)
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 4.5, 14.5_
    - _Design: 9.3 Component breakdown_
  - [ ] 15.2 Components feed/story/trending
    - `RlsFeedCardComponent`, `RlsReactionBarComponent`, `RlsStoryRingComponent`, `RlsStoryMapPinComponent`, `RlsTrendingCardComponent`
    - _Requirements: 5.2, 5.5, 8.6, 6.4, 14.5_
    - _Design: 9.3_
  - [ ] 15.3 Components panel/search/bottom-sheet
    - `RlsSearchBarComponent`, `RlsNearbyPanelComponent`, `RlsTrendingPanelComponent`, `RlsBottomSheetComponent`
    - _Requirements: 2.4, 14.5_
    - _Design: 9.3_
  - [ ] 15.4 Layout shell + pipes + styles
    - `RlsLayoutComponent` (map full-screen + bottom sheet host), `RlsHeaderComponent`, `RlsFooterComponent`; pipes `time-ago`, `distance`; Tailwind neon/glassmorphism trong `shared/styles`
    - _Requirements: 2.1, 2.4, 14.5_
    - _Design: 9.2, 9.3_

- [ ] 16. Pages (`app-mini/pages`)
  - [ ] 16.1 Home Map page
    - `HomeMapPage`: init map (last-known/default) → render snapshot `GET /map/bootstrap` ngay → recenter khi có vị trí; search/nearby/trending/bottom-sheet; debounce pan/zoom refetch; cluster ở zoom thấp; fallback `home_geohash`/default khi từ chối quyền
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 3.4_
    - _Design: 9.6 Luồng khởi động, 6.2_
  - [ ] 16.2 Local Feed + Location Detail pages
    - `LocalFeedPage` (cursor, scope area/campus/location), `LocationDetailPage`; tạo check-in/post + react/comment
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
    - _Design: 6.4, 9.2_
  - [ ] 16.3 Nearby Trending page
    - `TrendingPage`: hot/viral/event spots gần (dùng `distance.util` + `RlsTrendingService`), hiển thị reason
    - _Requirements: 6.1, 6.2, 6.4_
    - _Design: 6.7_
  - [ ] 16.4 Story Viewer page
    - `StoryViewerPage` (Swiper): story ring + story map + nearby; lọc hết hạn client bằng `story-expiry.util`
    - _Requirements: 8.2, 8.3, 8.6_
    - _Design: 6.6, 9.3_
  - [ ] 16.5 Notifications page
    - `NotificationsPage`: inbox cursor + đánh dấu đã đọc + nhận realtime
    - _Requirements: 9.1, 9.5_
    - _Design: 6.9_
  - [ ] 16.6 Auth pages + Profile
    - `LoginPage`/`RegisterPage` (email/password + Google) qua `RlsAuthService`; `ProfilePage` + logout; guard route protected
    - _Requirements: 1.1, 1.2, 1.3, 1.6_
    - _Design: 9.4, 9.5_

- [ ] 17. Wiring realtime client + resilience + push
  - [ ] 17.1 Gắn RlsRealtimeService vào Home Map
    - Subscribe `area.{geohash}` phủ viewport; áp dụng delta `marker.upserted`/`activity.tick`/`feed.item.created` qua `idempotency.util` (add/update không reload)
    - _Requirements: 3.6, 4.7, 5.4, 12.1, 12.2_
    - _Design: 7.1, 9.6_
  - [ ] 17.2 Reconnect resync + indicator "tạm dừng cập nhật"
    - Khi mất kết nối: hiện badge + dùng snapshot REST cuối; khi `connected` lại: refetch bootstrap + re-subscribe viewport để reconcile
    - _Requirements: 12.3, 12.4_
    - _Design: 3.3 Đảm bảo realtime, Error Handling_
  - [ ] 17.3 Tích hợp Capacitor push (FCM client)
    - Đăng ký device token → `POST /auth/fcm-token`; nhận push hot area/nearby event; deep-link payload
    - _Requirements: 9.2, 9.4_
    - _Design: 9.4 RlsNotificationService_
  - [ ]* 17.4 Integration test luồng map (snapshot → delta giả lập)
    - Render snapshot rồi áp delta giả lập, kiểm tra không trùng marker (idempotent) + counter cập nhật
    - _Requirements: 12.4, 15.2_

- [ ] 18. Checkpoint cuối — đảm bảo toàn bộ test pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. (Tùy chọn — Phase 2) Community, Events realtime, AI Recommendation, Engagement
  - [ ]* 19.1 Campus Community (backend + frontend)
    - `communities`/`community_user`, endpoints `/communities`, `/communities/{slug}`, `/communities/{id}/join`; kênh `campus.{communityId}`; `CommunityPage`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
    - _Design: 6.8, 3.1_
  - [ ]* 19.2 Realtime Events + countdown
    - `events` endpoints + `EventUpdated` trên `event.{eventId}`; badge countdown
    - _Requirements: 3.5, 7.2, 7.4_
    - _Design: 7.4, 6.8_
  - [ ]* 19.3 AI Recommendation đầy đủ
    - `GET /recommendations` kết hợp proximity + time-of-day + trend + preference + novelty (thay stub)
    - _Requirements: 10.1, 10.5_
    - _Design: 11.7_
  - [ ]* 19.4 Explore Challenge + Activity Ranking nâng cao
    - Ghi tiến độ challenge (check-in/discover/hunt); ranking campus
    - _Requirements: 11.2, 11.3_
    - _Design: 17.1_

- [ ] 20. (Tùy chọn — Phase 3) Social Commerce, Local Advertising, Creator system
  - [ ]* 20.1 Social Commerce module
    - _Design: 17 Phasing (Phase 3)_
  - [ ]* 20.2 Local Advertising module
    - _Design: 17 Phasing (Phase 3)_
  - [ ]* 20.3 Creator / Community system
    - _Design: 17 Phasing (Phase 3)_

## Notes

- Sub-task gắn `*` là **tùy chọn** (test hoặc Phase 2/3) và sẽ không được thực thi tự động; sub-task không có `*` là bắt buộc.
- Mỗi task tham chiếu requirement cụ thể (`_Requirements: X.Y_`) để truy vết; PBT tham chiếu trực tiếp property trong `design.md` (mục 13 Correctness Properties).
- Property tests xác thực các tính chất phổ quát (P1–P9); unit/feature tests xác thực ví dụ và biên.
- Hai project tách biệt: backend tại `c:\My BACKEND\Mini_admin`, frontend trong `c:\My BACKEND\Mini_app\src\app\app-mini`.
- App-mini KHÔNG tạo config URL mới — dùng `BASE_URL`/`API_URL` từ `src/environments/environment.ts`.
- Checkpoint đảm bảo kiểm thử tăng tiến tại các mốc hợp lý.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "10.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "10.2", "10.3", "12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7"] },
    { "id": 2, "tasks": ["2.2", "3.1", "11.1", "13.1", "13.2", "13.3", "13.4", "13.5", "13.6", "13.7"] },
    { "id": 3, "tasks": ["2.3", "3.2", "3.3", "4.1", "4.2", "4.3", "11.2", "11.3"] },
    { "id": 4, "tasks": ["2.4", "3.4", "4.4", "4.5", "11.4", "15.1", "15.2", "15.3"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "15.4"] },
    { "id": 6, "tasks": ["6.8", "7.1", "7.2", "7.5", "16.2", "16.3", "16.4", "16.5", "16.6"] },
    { "id": 7, "tasks": ["7.3", "7.4", "9.1", "16.1"] },
    { "id": 8, "tasks": ["7.6", "9.2", "9.3", "17.1", "17.3"] },
    { "id": 9, "tasks": ["9.4", "17.2"] },
    { "id": 10, "tasks": ["9.5", "17.4"] },
    { "id": 11, "tasks": ["19.1", "19.2", "19.3", "19.4"] },
    { "id": 12, "tasks": ["20.1", "20.2", "20.3"] }
  ]
}
```
