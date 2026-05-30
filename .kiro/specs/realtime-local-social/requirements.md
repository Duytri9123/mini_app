# Requirements Document

## Realtime Local Social Platform (`realtime-local-social`)

## Introduction

The Realtime Local Social Platform is a location-first realtime social network for Gen Z. Content is organized around **place + real-world activity + time** rather than a friend graph. On open, users land on a fullscreen "Realtime Community Map" showing hot areas, nearby activity, trending places, live stories, and realtime posts around their location.

The system has two parts: a Laravel admin/API backend (`Mini_admin`, greenfield, with a web admin UI, Sanctum auth, Reverb WebSocket broadcasting, queues, Redis cache, and Firebase push) and an Ionic Angular `app-mini` frontend module (under `src/app/app-mini`) that mirrors the existing `bro-jet` clean architecture and reuses the existing environment, Sanctum-token interceptor, Echo/Pusher realtime, Leaflet maps, and fast-check PBT setup.

These requirements are derived from the approved design document (`design.md`). Acceptance criteria use EARS phrasing (WHEN/IF ... THEN the system SHALL ...). Requirement numbers align with the design's feature areas and the correctness-property references in the design.

---

## Glossary

This glossary defines key domain terms used throughout the requirements.

- **Geohash cell** — a square map region identified by a base-32 geohash string; the unit of spatial aggregation.
- **Hot area** — a geohash cell whose recent activity score exceeds a threshold.
- **Activity counter** — a live count of people/check-ins active in a cell or location within a time window.
- **Story** — ephemeral media that auto-expires 24 hours after creation.
- **Reverb channel** — a WebSocket channel (area/campus/location/private-user) that clients subscribe to for realtime deltas.
- **Bootstrap** — the initial map payload (markers, heatmap, hot areas, trending, stories) loaded when the app opens.

---

## Requirements

### Requirement 1: Authentication and Roles

**User Story:** As a user, I want to register and log in with email/password and have a role-based identity, so that I can post and interact while moderators and admins manage the platform.

#### Acceptance Criteria
1. WHEN a visitor submits valid registration data THEN the system SHALL create a user account and return a Sanctum access token.
2. WHEN a user submits valid login credentials THEN the system SHALL return a Sanctum access token and the current user profile.
3. IF login or registration data is invalid THEN the system SHALL respond with a 422 validation error and SHALL NOT issue a token.
4. WHEN an authenticated request carries a valid token THEN the system SHALL attach the token via the `am-auth.interceptor` (Bearer) using `API_URL` derived from `BASE_URL`.
5. WHEN a protected endpoint receives a request with an expired or missing token THEN the system SHALL respond 401, the interceptor SHALL clear the stored token, and SHALL redirect to login ONLY if the current route is protected.
6. WHEN a user logs out THEN the system SHALL revoke the current token and clear stored session state.
7. THE system SHALL enforce role boundaries (`user`, `moderator`, `admin`) on every protected API and admin-web route.

### Requirement 2: Home Map Screen (design 6.1)

**User Story:** As a user, I want the app to open straight to a fullscreen realtime map of what's happening around me, so that I instantly know where to go.

#### Acceptance Criteria
1. WHEN the app launches THEN the system SHALL request the device location and render a fullscreen map centered near the user with minimal screen transitions.
2. WHEN the map is ready THEN the system SHALL load markers, heatmap cells, hot areas, trending spots, and nearby stories from `GET /api/map/bootstrap` for the current viewport.
3. IF location permission is denied or unavailable THEN the system SHALL fall back to the user's `home_geohash` (if logged in) or a default city center and SHALL still render the map.
4. THE map screen SHALL provide a search bar, a nearby panel, a trending panel, and a bottom sheet, all as small reusable Tailwind components.
5. WHEN map data is requested for a viewport THEN the system SHALL return only items within the viewport bounding box and SHALL cap result size for dense areas.
6. WHEN the user pans or zooms THEN the system SHALL debounce the viewport change and refetch/refresh markers and heatmap for the new bounds.

### Requirement 3: Marker System (design 6.2)

**User Story:** As a user, I want visually distinct image markers for different place types, so that I can read the map at a glance.

#### Acceptance Criteria
1. THE system SHALL render image markers using a place photo, user avatar, or post thumbnail.
2. THE system SHALL support marker types Food, Cafe, Event, Hot Area, and Campus, each with its specified neon glow/animation style.
3. WHEN a marker's activity count changes THEN the system SHALL update its pulse/glow intensity accordingly.
4. WHEN many markers fall within a small area at low zoom THEN the system SHALL cluster them, and clustering SHALL preserve the total marker count (no marker lost or duplicated).
5. WHEN an Event marker has a start time THEN the system SHALL display a countdown badge.
6. WHEN a `marker.upserted` realtime event arrives on a subscribed area channel THEN the system SHALL add or update the corresponding marker without a full reload.

### Requirement 4: Activity Heatmap (design 6.3)

**User Story:** As a user, I want a realtime activity heatmap, so that I can see which areas are hot, chill, nightlife, events, or trending.

#### Acceptance Criteria
1. WHEN activity events are aggregated THEN the system SHALL group them into geohash cells per category (food, cafe, nightlife, event, trend).
2. THE heatmap aggregation SHALL preserve total event count (sum of cell counts equals number of input events).
3. THE heatmap SHALL assign each non-empty cell a normalized score in the range (0, 1].
4. THE heatmap SHALL produce exactly one cell per distinct (geohash, category) pair.
5. WHEN the map zoom changes THEN the system SHALL select a geohash precision appropriate to the zoom level.
6. WHEN a check-in or activity occurs THEN the system SHALL increment the relevant live activity counter, and the counter SHALL never become negative.
7. WHEN an `activity.tick` realtime event arrives THEN the system SHALL update the displayed counter to the broadcast value.

### Requirement 5: Local Feed (design 6.4)

**User Story:** As a user, I want a feed scoped to an area, campus, or place, so that I see content relevant to where I am.

#### Acceptance Criteria
1. WHEN a user opens the local feed THEN the system SHALL return content scoped by area, campus, or place via `GET /api/feed` using cursor pagination.
2. THE feed SHALL support content types: check-in photos, short videos, food reviews, trends, community memes, and realtime posts.
3. WHEN a user creates a check-in or post THEN the system SHALL persist it and enqueue aggregation and fan-out jobs.
4. WHEN a `feed.item.created` realtime event arrives on a subscribed channel THEN the system SHALL prepend the new item to the relevant feed.
5. WHEN a user reacts to or comments on a post THEN the system SHALL persist the interaction and update the post's counts, enforcing one reaction per user per target.
6. IF a write endpoint is called too frequently THEN the system SHALL apply rate limiting to resist spam.

### Requirement 6: Nearby Trending (design 6.5)

**User Story:** As a user, I want suggestions of hot, crowded, viral, and event spots near me, so that I can decide where to go.

#### Acceptance Criteria
1. WHEN a user requests nearby trending THEN the system SHALL return spots near the user's location via `GET /api/trending/nearby`.
2. THE nearby filtering SHALL only include spots within the requested radius of the center point.
3. THE distance computation SHALL be non-negative and symmetric.
4. THE trending list SHALL annotate each spot with a reason (crowded, viral, event, or rising).
5. THE system SHALL recompute trending periodically via a scheduled queue job and serve cached results.

### Requirement 7: Campus Community (design 6.6)

**User Story:** As a student, I want a community per school with its own board, trends, events, and nearby hot places, so that I can follow campus life.

#### Acceptance Criteria
1. THE system SHALL support communities of type campus, area, and interest.
2. WHEN a user opens a campus community THEN the system SHALL return its feed, trends, student events, and hot places around the campus.
3. WHEN a user joins or leaves a community THEN the system SHALL update membership and member count.
4. WHEN a `feed.item.created` or `event.created` event is broadcast on a `campus.{communityId}` channel THEN subscribed clients SHALL update in realtime.

### Requirement 8: Realtime Stories (design 6.7)

**User Story:** As a user, I want 24-hour stories shown on the map and in a nearby ring, so that I can share and discover current activity.

#### Acceptance Criteria
1. WHEN a user creates a story THEN the system SHALL set `expires_at = created_at + 24h`.
2. THE system SHALL treat a story as active if and only if the current time is before its `expires_at`.
3. WHEN nearby stories are requested THEN the system SHALL return only active stories within the requested radius.
4. WHEN a story crosses its 24h boundary THEN the system SHALL stop displaying it client-side on the next render and SHALL mark it expired server-side via a scheduled job.
5. WHEN a story expires server-side THEN the system SHALL broadcast a `story.created`/`story.expired` delta so all clients converge.
6. THE system SHALL present stories as a story ring, a story map, and nearby stories.

### Requirement 9: Notifications (design 6.8)

**User Story:** As a user, I want realtime notifications about hot areas, friend check-ins, nearby events, and trending places, so that I don't miss what matters.

#### Acceptance Criteria
1. WHEN a notify-worthy event occurs (hot area, friend check-in, nearby event, trending place) THEN the system SHALL create a notification for the relevant users.
2. WHEN a notification is created THEN the system SHALL broadcast it on the recipient's `private-user.{userId}` channel.
3. THE `private-user.{userId}` channel SHALL be authorized server-side via Sanctum at `/api/broadcasting/auth`.
4. WHEN a user registers a device token THEN the system SHALL store it and send Firebase push for opted-in notification types.
5. WHEN a user marks a notification read THEN the system SHALL persist the read state.

### Requirement 10: Smart Recommendation (design 6.9)

**User Story:** As a user, I want "where to go today" suggestions based on my location, the time, community trends, and my history, so that I get relevant ideas.

#### Acceptance Criteria
1. WHEN a user requests recommendations THEN the system SHALL return a ranked list via `GET /api/recommendations`.
2. THE ranking output SHALL be a permutation of the candidate set (no items added, dropped, or duplicated).
3. THE ranking SHALL be sorted by score descending with a deterministic stable tie-break on `locationId`.
4. THE ranking SHALL be deterministic: identical inputs SHALL produce identical ordering.
5. THE recommendation score SHALL combine proximity, time-of-day fit, trend boost, preference affinity, and novelty.

### Requirement 11: Engagement Features

**User Story:** As a user, I want daily suggestions, activity rankings, and explore challenges, so that the app stays fun and habit-forming.

#### Acceptance Criteria
1. THE system SHALL present a Daily Suggestion ("Where to go today?").
2. THE system SHALL present Activity Rankings (top hot places, trending spots, most active campus).
3. WHEN a user completes an Explore Challenge action (check-in, discover new place, hunt trend) THEN the system SHALL record progress toward the challenge target.

### Requirement 12: Realtime Transport and Resilience

**User Story:** As a user, I want the app to stay usable and converge correctly even when the realtime connection drops, so that my experience is reliable.

#### Acceptance Criteria
1. THE app SHALL subscribe only to area channels for geohash cells in the current viewport plus its private user channel.
2. WHEN the viewport changes THEN the app SHALL diff and subscribe/unsubscribe channels accordingly.
3. IF the WebSocket connection drops THEN the app SHALL continue showing the last REST snapshot and SHALL indicate that live updates are paused.
4. WHEN the connection is restored THEN the app SHALL re-sync the viewport and refetch the bootstrap snapshot to reconcile missed deltas.
5. THE system SHALL broadcast realtime events only from queue jobs, not from the request thread.

### Requirement 13: Admin Web UI and Moderation

**User Story:** As a moderator or admin, I want a web admin UI to moderate content, handle reports, manage communities, and view analytics, so that I can operate the platform.

#### Acceptance Criteria
1. THE Laravel admin SHALL provide a web UI accessible only to `moderator` and `admin` roles.
2. WHEN a user reports content THEN the system SHALL create a report with status `open`.
3. WHEN a moderator hides or removes content THEN the system SHALL soft-delete it and resolve the related report.
4. THE admin UI SHALL allow admins to manage communities, users, events, and challenges, and view analytics.

### Requirement 14: Frontend Architecture and Reuse

**User Story:** As a developer, I want `app-mini` to mirror the existing `bro-jet` architecture and reuse existing mechanisms, so that the codebase stays consistent and maintainable.

#### Acceptance Criteria
1. THE `app-mini` module SHALL follow the `bro-jet` folder taxonomy (core, shared, layout, pages, features, tests).
2. THE module SHALL be registered as a lazy-loaded route (`path: 'app-mini'`) in `src/app/app-routing.module.ts`.
3. THE module SHALL read `BASE_URL`/`API_URL` from `src/environments/environment.ts` and SHALL NOT introduce a new config system.
4. THE module SHALL store Sanctum tokens via the existing device storage approach and attach them through an auth interceptor mirroring `BjAuthInterceptor`.
5. THE UI SHALL use Tailwind v4 utility classes with dark mode, neon glow, and light glassmorphism, split into small reusable components.
6. THE realtime layer SHALL use `laravel-echo` configured for the Reverb/Pusher protocol with `pusher-js`.

### Requirement 15: Quality and Property-Based Testing

**User Story:** As a developer, I want the core spatial and realtime logic covered by property-based tests, so that correctness is enforced as the system evolves.

#### Acceptance Criteria
1. THE core algorithms (geohash encode, geo-distance, radius filter, heatmap aggregation, story expiry, activity counter, recommendation ranking, clustering) SHALL be implemented as pure functions in `app-mini/core/utils`.
2. THE project SHALL validate the design's correctness properties using `fast-check` (Karma/Jasmine), following the existing `bro-jet/tests` convention.
3. EACH property test SHALL reference the requirement(s) it validates.
4. THE backend SHALL include feature tests asserting auth/role gates, that broadcasts fire on the correct channels, and that fan-out/aggregation jobs are dispatched.

### Requirement 16: Performance and Security

**User Story:** As a stakeholder, I want the platform to be fast and safe, so that it scales and protects users.

#### Acceptance Criteria
1. THE `GET /api/map/bootstrap` path SHALL read Redis aggregates and only query the database on cache miss.
2. THE marker and heatmap endpoints SHALL cap result size and cluster by geohash prefix at low zoom.
3. THE system SHALL NOT broadcast exact user coordinates on public channels; public area channels SHALL carry only coarse geohash-cell activity.
4. THE system SHALL serve API and WebSocket traffic over TLS at the admin host with matching CORS configuration.
5. THE system SHALL validate `lat`/`lng` ranges and sanitize media inputs on all write endpoints.
