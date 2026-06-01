# Implementation Plan: Realtime Local Social Platform (`realtime-local-social`)

## Overview

This plan turns the approved design into incremental, code-only steps across the two projects:

- **Mobile** — Ionic Angular module `app-mini` (`Mini_app/src/app/app-mini`): fullscreen realtime map, local feed, stories, notifications, trending. Mirrors the existing `bro-jet` taxonomy (core / shared / layout / pages / features / tests) and reuses `environment.ts` (`BASE_URL`/`API_URL`), the Sanctum-token interceptor pattern (`RlsAuthInterceptor`), `laravel-echo` + `pusher-js` realtime, Leaflet/MapLibre maps, and the existing `fast-check` PBT setup.
- **Backend** — Laravel `Mini_admin` (Sanctum, Reverb WebSocket, Redis cache/queue/heatmap buckets, Firebase FCM, Filament dashboard, spatie/laravel-permission, PostGIS/MySQL spatial). Single source of truth.

Ordering follows a frontend-first, dependency-safe path: **pure utils + their property tests first**, then core services, then shared components, then layout + pages, then the backend (models → migrations → services → auth/policies → realtime/jobs → endpoints → scheduled jobs → admin), then integration/feature tests. Mobile and backend work parallelize cleanly — the dependency graph at the end encodes safe execution waves.

**Scope priority:** Phase 1 (MVP, design §17) is the focus of tasks 1–16. Phase 2/3 work (full AI recommendation, campus community, realtime events, explore challenges, social commerce) is gathered in **task 17 and clearly deprioritized** — build only after the MVP is green.

Several files already exist in both projects (mobile utils, interfaces, constants, interceptor; backend models, observers, policies, `GeohashService`, `HeatmapAggregator`). Tasks targeting those are phrased "implement/complete/verify" so existing work is reused, never duplicated.

Property-based tests validate the design's **Correctness Properties** (design §13, Properties 1–9) using `fast-check` on mobile and Pest/PHPUnit random generators on the backend. Spatial/heatmap/story/distance properties are exercised on both stacks; clustering (P7) and idempotency (P9) live on mobile; permission invariants (P8) live on the backend. Sub-tasks marked `*` are optional tests and can be skipped for a faster MVP.

## Tasks

- [x] 1. Mobile module foundation and wiring (`app-mini`)
  - [x] 1.1 Verify and complete the lazy module wiring
    - Confirm `{ path: 'app-mini', loadChildren: ... }` in `src/app/app-routing.module.ts` (do not touch `gap-move`/`bro-jet`); confirm `AppMiniModule` registers `RlsAuthInterceptor` via `HTTP_INTERCEPTORS` (multi) module-scoped; confirm `app-mini-routing.module.ts` lazy-loads pages
    - _Requirements: 14.1, 14.2, 14.4, 14.6_
  - [x] 1.2 Complete core interfaces and barrel (single source of truth)
    - Verify/extend `core/interfaces` (`location`, `post`, `story`, `map-marker`, `marker`, `heat-point`, `event`, `notification`, `cluster`) and `index.ts` so utils, services, and components share one type definition
    - _Requirements: 14.1, 3.1, 3.2, 8.6_
  - [x] 1.3 Complete `rls-config` constants
    - Verify heat weights, geohash precisions + zoom breakpoints, channel cap, idempotency LRU size, storage key (`rls_access_token`), map defaults, debounce timings, and API path map; no hardcoded URLs (host comes from `API_URL`)
    - _Requirements: 14.3, 4.2, 12.1, 16.3_

- [ ] 2. Mobile core pure utilities and property-based tests
  - [-] 2.1 Implement/complete `geohash.util` (encode, bounds, coverBbox)
    - Mirror backend `GeohashService` (design §11.1); enforce lat/lng/precision preconditions and a `maxCells` cap with precision-fallback error
    - _Requirements: 4.1, 4.5, 2.5, 15.1_
  - [ ]* 2.2 Write property test for geohash containment + prefix monotonicity
    - **Property 3: Geohash containment + prefix monotonicity** (encoded point lies inside `bounds(hash)`; lower precision is a prefix of higher precision)
    - **Validates: Requirements 4.1, 4.5**
  - [ ]* 2.3 Write property test for viewport cover completeness
    - **Property 4: Viewport cover completeness** (every point of a valid bbox lies in some cell returned by `coverBbox`)
    - **Validates: Requirements 2.5, 12.1**
  - [-] 2.4 Implement/complete `heatmap-score.util` (addEvent, readScore, decay)
    - Mirror backend `HeatmapAggregator` incremental `(scoreAtRef, refTs)` model; `λ = ln(2)/halfLife`; pure (returns new state)
    - _Requirements: 4.2, 4.3, 4.6, 15.1_
  - [ ]* 2.5 Write property test for heatmap time-decay monotonicity
    - **Property 1: Heatmap time-decay monotonicity** (with no new events `readScore` is non-increasing in time and always `>= 0`)
    - **Validates: Requirements 4.3, 4.6**
  - [ ]* 2.6 Write property test for heatmap add commutativity + additivity
    - **Property 2: Heatmap add commutativity & additivity** (order-independent at equal timestamps; `readScore` at `now` rises by exactly `+weight`)
    - **Validates: Requirements 4.1, 4.2**
  - [-] 2.7 Implement/complete `distance.util` (haversine + radius filter)
    - Mirror backend nearby algorithm (design §11.3): non-negative/symmetric distance, `filterWithinRadius` returns within-radius points sorted ascending
    - _Requirements: 6.2, 6.3, 15.1_
  - [ ]* 2.8 Write property test for nearby distance correctness
    - **Property 6: Nearby distance soundness / sortedness / completeness**
    - **Validates: Requirements 6.1, 6.2, 6.3**
  - [-] 2.9 Implement/complete `cluster.util` (clusterMarkers)
    - Web-Mercator pixel-grid clustering (design §11.6); deterministic, side-effect free
    - _Requirements: 3.4, 15.1_
  - [ ]* 2.10 Write property test for marker clustering
    - **Property 7: Marker clustering preservation & partition** (`Σ cluster.count === markers.length`; every marker in exactly one cluster)
    - **Validates: Requirements 3.4**
  - [-] 2.11 Implement/complete `story-expiry.util` (computeExpiresAt, isStoryActive)
    - `expires_at = created_at + 24h`; `isStoryActive ⟺ status==='active' ∧ now < expiresAt`; pure (`now` injected)
    - _Requirements: 8.1, 8.2, 15.1_
  - [ ]* 2.12 Write property test for client story expiry invariants
    - **Property 5: Story expiry invariants** (client predicate side: expiry boundary + active definition)
    - **Validates: Requirements 8.1, 8.2, 8.4**
  - [-] 2.13 Implement/complete `idempotency.util` (LRU set, applyOnce)
    - Bounded LRU of processed event ids; `applyOnce` folds an event exactly once (design §3.3)
    - _Requirements: 3.6, 5.4, 12.4, 15.1_
  - [ ]* 2.14 Write property test for realtime idempotency
    - **Property 9: Realtime idempotency** (applying the same event id n times yields the same state as applying it once)
    - **Validates: Requirements 3.6, 5.4, 12.4**
  - [-] 2.15 Implement/complete `ranking.util` (client ranking helpers)
    - Permutation-preserving, score-descending with stable `locationId` tie-break, deterministic; weighted-sum score model
    - _Requirements: 10.2, 10.3, 10.4, 15.1_
  - [ ]* 2.16 Write unit test for ranking determinism and permutation
    - Identical inputs → identical order; output is a permutation of candidates; stable tie-break
    - _Requirements: 10.2, 10.3, 10.4_

- [ ] 3. Mobile core services
  - [-] 3.1 Implement `RlsApiService`
    - HTTP wrapper over `API_URL` from `environment.ts`; standard `{ data, meta?, message? }` handling (mirror `BjApiService`)
    - _Requirements: 14.3, 16.1_
  - [~] 3.2 Implement `RlsAuthService` and `RlsAuthGuard`
    - Login/register/Google, token storage (`rls_access_token`), `currentUser$`; guard protected routes; logout revokes + clears state
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 14.4_
  - [-] 3.3 Implement `RlsGeolocationService`
    - `@capacitor/geolocation` wrapper, watch + permission handling, fallback to `home_geohash`/default center
    - _Requirements: 2.1, 2.3_
  - [~] 3.4 Implement `RlsMapService`
    - `BehaviorSubject` state for center/zoom/bbox/markers/heat; debounced viewport change; zoom→geohash precision selection (mirror `BjMapService`)
    - _Requirements: 2.2, 2.6, 3.3, 4.5_
  - [~] 3.5 Implement `RlsRealtimeService` (Echo + Reverb)
    - `laravel-echo` + `pusher-js` configured for Reverb/Pusher; viewport channel diff subscribe/unsubscribe with hard cap; per-event idempotency via `idempotency.util`; reconnect hook
    - _Requirements: 12.1, 12.2, 14.6, 3.6, 5.4_
  - [~] 3.6 Implement `RlsFeedService`
    - Cursor-paginated scoped feed (area/community/location); prepend `feed.item.created` deltas via idempotency; create post/check-in; react/comment count updates
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [~] 3.7 Implement `RlsStoryService`
    - Create story, load nearby active (client filter via `story-expiry.util`), story map; converge on `story.expired` delta
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [~] 3.8 Implement `RlsNotificationService`
    - Inbox cursor load + realtime on `private-user.{userId}`; mark read / read-all
    - _Requirements: 9.1, 9.2, 9.5_
  - [~] 3.9 Implement `RlsTrendingService`
    - Nearby trending / hot places / rankings served from cached backend results, each with a reason
    - _Requirements: 6.1, 6.4, 6.5, 11.2_
  - [-] 3.10 Implement `RlsToastService`
    - Toast/feedback helper (mirror `BjToastService`)
    - _Requirements: 14.5_
  - [ ]* 3.11 Write unit tests for realtime subscribe-diff and map state
    - Channel diff on viewport change with cap; idempotent delta application; map state transitions
    - _Requirements: 12.1, 12.2, 12.4_

- [ ] 4. Mobile shared components and pipes (standalone, Tailwind v4)
  - [~] 4.1 Implement map render components
    - `RlsMapMarkerComponent` (glow/pulse by type + count), `RlsHeatLayerComponent` (MapLibre heat), `RlsMarkerClusterComponent`, `RlsActivityCounterComponent`, `RlsNeonBadgeComponent` (countdown/count)
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 4.4, 14.5_
  - [~] 4.2 Implement shell/panel components
    - `RlsBottomSheetComponent` (snap points), `RlsSearchBarComponent`, `RlsNearbyPanelComponent`, `RlsTrendingPanelComponent`
    - _Requirements: 2.4, 14.5_
  - [~] 4.3 Implement feed/story/trending card components
    - `RlsFeedCardComponent`, `RlsReactionBarComponent`, `RlsStoryRingComponent`, `RlsStoryMapPinComponent`, `RlsTrendingCardComponent`
    - _Requirements: 5.2, 5.5, 8.6, 6.4, 14.5_
  - [~] 4.4 Implement shared pipes and neon/glassmorphism styles
    - `time-ago.pipe`, `distance.pipe`; dark-mode neon glow + light glassmorphism utilities in `shared/styles`
    - _Requirements: 14.5, 6.3_

- [ ] 5. Mobile layout and pages
  - [~] 5.1 Implement layout shell and the page route table
    - `RlsLayoutComponent` (fullscreen map host + bottom-sheet host), `RlsHeaderComponent` (search + notification bell), `RlsFooterComponent` (tab bar); define the full `app-mini` route table (lazy `loadComponent` for all pages) so page tasks add no routing edits
    - _Requirements: 2.4, 14.1, 14.5_
  - [~] 5.2 Implement `HomeMapPage`
    - Open straight to fullscreen map; load `GET /api/map/bootstrap` snapshot; recenter on geolocation; debounce pan/zoom → refetch + select geohash precision; subscribe area channels; apply `marker.upserted`/`activity.tick` deltas without reload; cluster at low zoom
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 3.4, 3.6, 4.5, 4.7_
  - [~] 5.3 Implement `LocalFeedPage` and `LocationDetailPage`
    - Render scoped feed; create check-in/post; react/comment with count update; realtime prepend
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  - [~] 5.4 Implement `StoryViewerPage`
    - Swiper-based viewer; client filters expired stories; story ring + story map pins
    - _Requirements: 8.6, 14.5_
  - [~] 5.5 Implement `TrendingPage`
    - Nearby hot/viral/event spots with reasons via `RlsTrendingService`
    - _Requirements: 6.1, 6.4, 11.2_
  - [~] 5.6 Implement `NotificationsPage` and Capacitor FCM push
    - Register device token → `POST /api/auth/fcm-token`; handle push receipt/deep-link; inbox UI + mark read
    - _Requirements: 9.4, 9.5_
  - [~] 5.7 Implement `ProfilePage`
    - Basic profile + check-in history view
    - _Requirements: 6.3, 14.5_
  - [~] 5.8 Implement auth pages (login/register) and guard wiring
    - Login/register forms calling `RlsAuthService`; 422 surfacing; protect personal routes with `RlsAuthGuard`
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [~] 6. Checkpoint — mobile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Backend foundation and configuration (`Mini_admin`)
  - [x] 7.1 Verify and complete environment, broadcasting, queue, cache, CORS, TLS
    - Confirm installed deps (Sanctum, Reverb, spatie/permission, Filament, predis, kreait firebase, Pest); configure Reverb broadcasting, Redis cache + queue connections, Sanctum, and CORS to match the admin host used by `environment.ts`; add `.env.example` keys (no secrets); ensure API + WS over TLS
    - _Requirements: 14.3, 16.1, 16.4, 12.5_

- [ ] 8. Backend data layer (migrations, models, observers)
  - [x] 8.1 Create database migrations and indexes
    - Migrations for `users`, `locations`, `posts`, `stories`, `checkins`, `reactions`, `comments`, `notifications`, `communities`, `events`, `reports`; apply the index strategy from design §5.2 (spatial/geohash indexes, composite `(geohash6, created_at DESC)`, unique reaction index, story `expires_at` partial index)
    - _Requirements: 16.1, 16.2, 5.5, 8.1_
  - [-] 8.2 Complete Eloquent models and relationships
    - Relationships, fillable/casts, polymorphic reactions, soft-deletes for moderatable content
    - _Requirements: 1.7, 5.5, 13.3_
  - [~] 8.3 Complete geohash + story-expiry observers
    - `LocationObserver`, `PostObserver`, `CheckinObserver` compute `geohash5/geohash6` on save; `StoryObserver` sets `expires_at = created_at + 24h`; register in a service provider
    - _Requirements: 4.1, 8.1_
  - [ ]* 8.4 Write unit tests for observers
    - Assert geohash columns populated and `expires_at == created_at + 24h`
    - _Requirements: 4.1, 8.1_
  - [~] 8.5 Create factories and seeders for demo data
    - Model factories + a demo seeder (locations, posts, stories, check-ins) for feature tests and dashboard
    - _Requirements: 16.2_

- [ ] 9. Backend geospatial and heatmap services + property tests
  - [-] 9.1 Implement/complete `GeohashService` (encode, bounds, coverBbox)
    - Port design §11.1; enforce preconditions and a `maxCells` cap with precision fallback
    - _Requirements: 4.1, 4.5, 2.5_
  - [ ]* 9.2 Write property test for geohash containment + prefix monotonicity (backend)
    - **Property 3: Geohash containment + prefix monotonicity**
    - **Validates: Requirements 4.1, 4.5**
  - [ ]* 9.3 Write property test for viewport cover completeness (backend)
    - **Property 4: Viewport cover completeness**
    - **Validates: Requirements 2.5, 12.1**
  - [-] 9.4 Implement/complete `HeatmapAggregator` (Redis incremental time-decay)
    - Port design §11.2: `addEvent`, `readScore`, `dominantCategory`, `hotBuckets` using per-bucket `(score, refTs)` hash + per-category sub-scores + ranking sorted set; `λ = ln(2)/halfLife`
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 16.1_
  - [ ]* 9.5 Write property test for heatmap time-decay monotonicity (backend)
    - **Property 1: Heatmap time-decay monotonicity**
    - **Validates: Requirements 4.3, 4.6**
  - [ ]* 9.6 Write property test for heatmap add commutativity + additivity (backend)
    - **Property 2: Heatmap add commutativity & additivity**
    - **Validates: Requirements 4.1, 4.2**
  - [~] 9.7 Implement `GeospatialQueryService` (nearby)
    - Port design §11.3: bbox prefilter then exact distance filter + ascending sort; PostGIS `ST_DWithin`/KNN path with portable haversine fallback
    - _Requirements: 6.1, 6.2, 6.3, 16.2_
  - [ ]* 9.8 Write property test for nearby distance correctness (backend)
    - **Property 6: Nearby distance soundness / sortedness / completeness**
    - **Validates: Requirements 6.1, 6.2, 6.3**
  - [~] 9.9 Implement `RankingService` (trending / hot places)
    - Read decayed hot buckets + nearby; annotate each spot with a reason (crowded/viral/event/rising); cacheable results
    - _Requirements: 6.4, 6.5, 11.2_

- [ ] 10. Backend authentication and permissions
  - [~] 10.1 Implement Sanctum auth endpoints and FormRequests
    - `AuthController`: `register`, `login`, `google`, `logout`, `me`, `fcm-token`; issue/revoke tokens; 422 on invalid input
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 9.4, 16.5_
  - [~] 10.2 Configure roles/permissions and seeder
    - `spatie/laravel-permission` roles `user`/`moderator`/`admin` with a seeder
    - _Requirements: 1.7_
  - [~] 10.3 Complete policies and the `moderate` gate
    - `PostPolicy`, `StoryPolicy`, `CheckinPolicy`, `CommentPolicy` enforcing ownership; `moderate` gate for moderator/admin; register in `AuthServiceProvider`
    - _Requirements: 1.7, 5.5, 13.1, 13.3_
  - [ ]* 10.4 Write property test for permission invariants
    - **Property 8: Permission invariants** (ownership rule + privilege monotonicity admin ⊇ moderator ⊇ user)
    - **Validates: Requirements 1.7, 13.1**
  - [ ]* 10.5 Write feature tests for auth and role gates
    - Token issue/revoke, 401 handling, role boundaries on protected routes
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 15.4_

- [ ] 11. Backend realtime events, channels, and jobs
  - [~] 11.1 Define broadcast events with payload contracts
    - `NewMarker`, `ActivityCounterUpdated`, `NewFeedItem`, `NotificationReceived` with `broadcastAs` + payloads from design §7; include a uuid `id` for client idempotency; coarse geohash only on public channels
    - _Requirements: 3.6, 4.7, 5.4, 9.2, 16.3_
  - [~] 11.2 Define channels and broadcasting authorization
    - `routes/channels.php`: public `area.{geohash}`, `presence-area.{geohash5}`, private `private-user.{userId}` authorized via Sanctum at `/api/broadcasting/auth`
    - _Requirements: 9.3, 12.1, 16.3_
  - [~] 11.3 Implement queue jobs for broadcast/fan-out/push/ranking
    - `BroadcastCheckin`, `FanoutFeed`, `UpdateRankings`, `SendNearbyPush`; broadcasting happens only inside jobs (never the request thread); counter broadcasts are debounced
    - _Requirements: 4.7, 5.3, 9.1, 12.5_
  - [ ]* 11.4 Write feature tests for broadcasts and job dispatch
    - Assert correct channel/event with `Event::fake()` and that aggregation/fan-out jobs dispatch on write
    - _Requirements: 5.3, 12.5, 15.4_

- [ ] 12. Backend API endpoints
  - [~] 12.1 Implement `MapController` (bootstrap/snapshot, heatmap, markers, nearby, hot-areas)
    - Read Redis aggregates first, DB on cache miss; clamp to viewport bbox and cap result size; GeoJSON heat points with decayed score + dominant category
    - _Requirements: 2.2, 2.5, 4.1, 4.3, 4.5, 6.1, 16.1, 16.2_
  - [~] 12.2 Implement `FeedController` and `PostController`
    - Cursor-paginated scoped feed; create post; one reaction per user per target; comment threading; throttle write routes
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 16.5_
  - [~] 12.3 Implement `CheckinController`
    - Transactional create (observer sets geohash) → `HeatmapAggregator.addEvent` → dispatch `BroadcastCheckin`/`UpdateRankings`/`SendNearbyPush`; `me` history
    - _Requirements: 4.6, 5.3, 16.5_
  - [~] 12.4 Implement `StoryController`
    - Create (24h expiry), nearby active stories within radius, story map by bbox, show
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 16.5_
  - [~] 12.5 Implement `TrendingController`
    - `nearby` + `places` served from cached `RankingService` results
    - _Requirements: 6.1, 6.4, 6.5, 11.2_
  - [~] 12.6 Implement `NotificationController` and FCM push
    - Inbox cursor list, mark read / read-all, store device token, send Firebase push for opted-in types
    - _Requirements: 9.1, 9.4, 9.5_
  - [~] 12.7 Implement `LocationController`
    - Location detail + stats, location feed; create/update/delete gated to moderator/admin
    - _Requirements: 5.1, 13.4, 16.5_
  - [~] 12.8 Implement `RecommendationController` (Phase 1 stub)
    - `GET /api/recommendations` returns `RankingService` results with reasons (AI deferred to Phase 2)
    - _Requirements: 10.1, 11.1_
  - [~] 12.9 Register API routes and middleware
    - Wire all controllers in `routes/api.php` behind `auth:sanctum` (public exceptions marked), apply `throttle` to write routes, validate `lat`/`lng` ranges, attach interceptor-compatible JSON error shape
    - _Requirements: 1.4, 5.6, 16.4, 16.5_
  - [ ]* 12.10 Write feature tests for API endpoints
    - Auth/ownership, viewport bbox cap, validation errors, cursor pagination for map/feed/checkin/story/trending/notification
    - _Requirements: 2.2, 2.5, 5.1, 5.5, 6.2, 8.3, 9.5, 16.2, 16.5_

- [ ] 13. Backend scheduled jobs
  - [~] 13.1 Implement `ExpireStories` job
    - Mark `status='active'` stories with `expires_at <= now` as `expired` in chunks; never touch unexpired stories; broadcast a `story.expired` delta so clients converge
    - _Requirements: 8.4, 8.5_
  - [ ]* 13.2 Write property test for story expiry job invariants
    - **Property 5: Story expiry invariants** (expiry boundary + no early expiry of `expires_at > now`)
    - **Validates: Requirements 8.1, 8.2, 8.4**
  - [~] 13.3 Implement `RecomputeHeatmapDecay` and register the scheduler
    - Snapshot the decayed ranking set for hot areas; schedule `ExpireStories` (every 5 min), `RecomputeHeatmapDecay` (every 1 min), `UpdateRankings` cadence
    - _Requirements: 6.5, 8.4, 12.5_

- [ ] 14. Backend admin dashboard (Filament) and moderation
  - [~] 14.1 Configure the Filament panel with role-gated access
    - Restrict the panel to `moderator` and `admin` roles
    - _Requirements: 13.1_
  - [~] 14.2 Create Filament resources
    - `UserResource`, `PostResource`, `LocationResource`, `CommunityResource`, `EventResource`, `ReportResource`
    - _Requirements: 13.4_
  - [~] 14.3 Implement moderation queue and report flow
    - Create report with status `open`; hide/remove soft-deletes content and resolves the related report with an audit entry
    - _Requirements: 13.2, 13.3_
  - [~] 14.4 Implement analytics widgets
    - `ActiveUsersWidget`, `HotAreasWidget`, `TrendingPlacesWidget`, `ReportsBacklogWidget`
    - _Requirements: 13.4_
  - [ ]* 14.5 Write feature tests for admin access control and moderation
    - Non-staff blocked; report open→resolve; content soft-delete
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 15. Integration and resilience wiring
  - [~] 15.1 Wire realtime resilience (mobile)
    - On WS drop show last REST snapshot + "live paused" indicator; on reconnect re-sync the viewport and refetch the bootstrap snapshot to reconcile missed deltas; broadcasts originate only from queue jobs
    - _Requirements: 12.3, 12.4, 12.5_
  - [ ]* 15.2 Write integration test for open→snapshot→delta flow
    - Open app renders bootstrap snapshot, then applies simulated marker/feed/counter deltas idempotently
    - _Requirements: 2.2, 3.6, 4.7, 5.4_

- [~] 16. Final checkpoint — Phase 1 (MVP)
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Phase 2 / Phase 3 work (DEPRIORITIZED — build only after MVP is green)
  - [~] 17.1 [Phase 2] Implement full AI `RecommendationService` ranking
    - Replace the Phase 1 stub: combine proximity, time-of-day fit, trend boost, preference affinity, and novelty into a deterministic, permutation-preserving, score-descending ranking; back `GET /api/recommendations` and `RlsRecommendationService` (daily suggestion)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1_
  - [~] 17.2 [Phase 2] Implement campus community
    - `CommunityController` (list, detail board + trends + events + hot places, join/leave + member count), `community.{communityId}` channel updates, `RlsCommunityService`, and the `CommunityPage`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [~] 17.3 [Phase 2] Implement realtime events + countdown
    - `EventController` (list/create gated to mod/admin), `EventUpdated` event on `event.{eventId}`, event-marker countdown badge wiring, `events` feature module on mobile
    - _Requirements: 3.5, 7.4_
  - [~] 17.4 [Phase 2] Implement activity rankings and explore challenges
    - Advanced activity rankings (top hot places, most active campus) and Explore Challenge progress recording (check-in / discover / hunt trend)
    - _Requirements: 11.2, 11.3_
  - [~] 17.5 [Phase 3] Scaffold social commerce / local advertising / creator system
    - Establish module/service scaffolding and data-model stubs for the Phase 3 surfaces (design §17); detailed behavior to be specified in a future spec before full implementation
    - _Requirements: (design §17 — no Phase 1 acceptance criteria)_

## Notes

- Sub-tasks marked with `*` are optional (unit / property / integration tests) and can be skipped for a faster MVP; core implementation sub-tasks are never optional.
- **Task 17 (Phase 2/3) is deprioritized** — it exists for completeness and dependency tracking only. Do not start it until Phase 1 (tasks 1–16) is complete and green.
- Each task references specific requirement clauses for traceability; property-test tasks additionally cite the design's Correctness Property (design §13).
- Properties 1–9 are each their own sub-task placed next to the code they validate. Spatial/heatmap/story/distance properties (P1–P6) are validated on both stacks (mobile `fast-check`, backend Pest); clustering (P7) and idempotency (P9) are mobile-only; permission invariants (P8) are backend-only.
- Existing files are reused, not duplicated: mobile `core/utils/{geohash,heatmap-score,distance,cluster,idempotency,story-expiry,ranking}.util.ts`, `core/interceptors/rls-auth.interceptor.ts`, `core/constants/rls-config.constants.ts`, `core/interfaces/*`; backend `Models/*`, `Observers/*`, `Policies/*`, `Services/{GeohashService,HeatmapAggregator}.php` — tasks "complete/verify" these.
- Mobile components are standalone and services use `providedIn: 'root'`; the full route table is defined once in task 5.1 so page tasks (5.2–5.8) add their own files without touching routing.
- All realtime broadcasts originate from queue jobs (never the request thread); public area channels carry only coarse geohash activity, never raw user coordinates.
- Mobile uses `BASE_URL`/`API_URL` from `environment.ts` only — no hardcoded URLs.
- Checkpoints (tasks 6 and 16) and top-level epics are not part of the dependency graph below — only leaf sub-tasks are scheduled.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "7.1", "8.1"] },
    { "id": 1, "tasks": ["2.1", "2.4", "2.7", "2.9", "2.11", "2.13", "2.15", "3.1", "3.3", "3.10", "8.2", "9.1", "9.4"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5", "2.6", "2.8", "2.10", "2.12", "2.14", "2.16", "3.2", "3.4", "8.3", "9.2", "9.3", "9.5", "9.6", "9.7", "10.1", "10.3"] },
    { "id": 3, "tasks": ["3.5", "3.6", "3.7", "3.8", "3.9", "4.1", "4.2", "4.3", "4.4", "8.4", "9.8", "9.9", "10.2", "11.1", "11.2"] },
    { "id": 4, "tasks": ["3.11", "5.1", "5.8", "8.5", "10.4", "10.5", "11.3", "13.1", "14.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "11.4", "12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "12.8", "13.2", "13.3", "14.2"] },
    { "id": 6, "tasks": ["12.9", "14.3", "14.4", "15.1"] },
    { "id": 7, "tasks": ["12.10", "14.5", "15.2"] },
    { "id": 8, "tasks": ["17.1", "17.2", "17.3", "17.4"] },
    { "id": 9, "tasks": ["17.5"] }
  ]
}
```
