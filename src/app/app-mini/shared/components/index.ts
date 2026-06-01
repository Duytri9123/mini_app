/**
 * REALTIME LOCAL SOCIAL (app-mini) — Barrel export cho shared components.
 *
 * Các presentational standalone component (design.md §9.3). Map render
 * components (task 4.1):
 *   - RlsMapMarkerComponent      — marker ảnh glow/pulse theo type + count
 *   - RlsHeatLayerComponent      — heatmap layer (MapLibre)
 *   - RlsMarkerClusterComponent  — cụm marker (campus cluster anim)
 *   - RlsActivityCounterComponent— live counter "X đang hoạt động"
 *   - RlsNeonBadgeComponent      — badge countdown/count neon
 *
 * Shell/panel components (task 4.2) — design §6.1 map screen panels:
 *   - RlsBottomSheetComponent    — bottom sheet kéo nhanh (snap points)
 *   - RlsSearchBarComponent      — thanh tìm kiếm glassmorphism (@Output query)
 *   - RlsNearbyPanelComponent    — panel "gần bạn" (@Input places)
 *   - RlsTrendingPanelComponent  — panel trending (@Input items)
 */
export * from './rls-neon-badge/rls-neon-badge.component';
export * from './rls-activity-counter/rls-activity-counter.component';
export * from './rls-map-marker/rls-map-marker.component';
export * from './rls-marker-cluster/rls-marker-cluster.component';
export * from './rls-heat-layer/rls-heat-layer.component';

/**
 * Feed / story / trending card components (task 4.3, design.md §9.3):
 *   - RlsFeedCardComponent     — card 1 item feed (check-in/review/video/meme/text)
 *   - RlsReactionBarComponent  — thanh reaction (like/love/fire/wow)
 *   - RlsStoryRingComponent    — vòng story (gradient ring + seen state)
 *   - RlsStoryMapPinComponent  — pin story trên bản đồ
 *   - RlsTrendingCardComponent — card địa điểm trending (kèm reason)
 */
export * from './rls-reaction-bar/rls-reaction-bar.component';
export * from './rls-feed-card/rls-feed-card.component';
export * from './rls-story-ring/rls-story-ring.component';
export * from './rls-story-map-pin/rls-story-map-pin.component';
export * from './rls-trending-card/rls-trending-card.component';

// Task 4.2 — shell/panel components (standalone, Tailwind v4)
export * from './rls-bottom-sheet/rls-bottom-sheet.component';
export * from './rls-search-bar/rls-search-bar.component';
export * from './rls-nearby-panel/rls-nearby-panel.component';
export * from './rls-trending-panel/rls-trending-panel.component';
