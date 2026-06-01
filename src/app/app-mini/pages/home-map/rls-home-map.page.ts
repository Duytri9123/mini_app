import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import * as maplibregl from 'maplibre-gl';
import { catchError, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { RlsApiService } from '../../core/services/rls-api.service';
import { RlsMapService } from '../../core/services/rls-map.service';
import {
  RLS_API,
  RLS_DEFAULT_RADIUS_M,
  RLS_MAP,
} from '../../core/constants/rls-config.constants';
import {
  RlsBbox,
  RlsMapMarker,
  RlsMapSnapshot,
  RlsMarker,
  RlsNearbyLocation,
  RlsTrendingPlace,
} from '../../core/interfaces';
import { RlsSearchBarComponent } from '../../shared/components/rls-search-bar/rls-search-bar.component';
import { RlsNearbyPanelComponent } from '../../shared/components/rls-nearby-panel/rls-nearby-panel.component';
import { RlsTrendingPanelComponent } from '../../shared/components/rls-trending-panel/rls-trending-panel.component';
import { RlsMapCanvasService } from '../../core/services/rls-map-canvas.service';

/** Tab đang chọn trong bottom sheet. */
type RlsHomeTab = 'nearby' | 'trending';

/** Khoảng thời gian auto-rotate toast (ms). */
const TOAST_ROTATE_INTERVAL_MS = 4000;

/**
 * RlsHomeMapPage — màn hình chính của app-mini: bản đồ realtime toàn màn hình.
 *
 * Toast "NEARBY TRENDING" ở góc dưới trái tự động xoay vòng qua các trending
 * spots (quán ăn, bài post viral, người dùng active) với animation slide.
 * Dữ liệu lấy từ `GET /trending/nearby` — backend trả kèm trending_post +
 * active_users + reason_label cho mỗi spot.
 */
@Component({
  selector: 'rls-home-map',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RlsSearchBarComponent,
    RlsNearbyPanelComponent,
    RlsTrendingPanelComponent,
  ],
  templateUrl: './rls-home-map.page.html',
  styleUrls: ['./rls-home-map.page.scss'],
})
export class RlsHomeMapPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  mapContainer!: ElementRef<HTMLDivElement>;

  /** Tab hiện tại của bottom sheet. */
  activeTab: RlsHomeTab = 'nearby';

  /** Drawer mở/đóng. */
  panelOpen = false;

  /** Chế độ vệ tinh. */
  isSatellite = false;

  /** Trạng thái nạp dữ liệu để hiện skeleton trong panel. */
  loadingNearby = false;
  loadingTrending = false;

  /** Đang định vị GPS. */
  locating = false;

  /** Dữ liệu hiển thị trong panel. */
  nearby: RlsNearbyLocation[] = [];
  trending: RlsTrendingPlace[] = [];

  // ── Toast auto-rotate ────────────────────────────────────────────────────
  /** Index của item đang hiển thị trên toast. */
  toastIndex = 0;

  /**
   * Trạng thái animation: 'idle' | 'exit' | 'enter'.
   * - exit  → slide ra ngoài (cũ)
   * - enter → slide vào (mới)
   */
  toastAnim: 'idle' | 'exit' | 'enter' = 'idle';

  private rotateTimer?: ReturnType<typeof setInterval>;
  private animTimer?: ReturnType<typeof setTimeout>;

  // ── Map internals ────────────────────────────────────────────────────────
  private map?: maplibregl.Map;
  private domMarkers: maplibregl.Marker[] = [];
  private userMarker?: maplibregl.Marker;

  constructor(
    private readonly api: RlsApiService,
    private readonly mapState: RlsMapService,
    private readonly canvasMarker: RlsMapCanvasService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  // ── Getters cho template ─────────────────────────────────────────────────

  /** Item trending đang hiển thị trên toast. */
  get toastItem(): RlsTrendingPlace | null {
    return this.trending[this.toastIndex] ?? null;
  }

  /** Nhãn thời gian của toast item. */
  get toastTimeAgo(): string {
    return this.toastItem?.timeAgo ?? '2m ago';
  }

  /** Tên địa điểm hiển thị trên toast. */
  get toastTitle(): string {
    const item = this.toastItem;
    if (!item) return 'Bến bờ Huế secret spot 🍜';
    const emoji = this.categoryEmoji(item.category);
    return `${item.name} ${emoji}`;
  }

  /** Dòng phụ của toast — ưu tiên: active users > trending post > reason label. */
  get toastSub(): string {
    const item = this.toastItem;
    if (!item) return '@minh_nguyen is here with 5 oth...';

    // Có người dùng active → hiện tên + số người
    if (item.activeUsers && item.activeUsers.length > 0) {
      const first = item.activeUsers[0];
      const rest = (item.activeCount ?? item.activeUsers.length) - 1;
      const name = first.username ? `@${first.username}` : (first.name ?? 'ai đó');
      return rest > 0
        ? `${name} đang ở đây cùng ${rest} người khác`
        : `${name} đang ở đây`;
    }

    // Có bài post trending → hiện snippet
    if (item.trendingPost?.content) {
      const snippet = item.trendingPost.content.slice(0, 50);
      return snippet.length < item.trendingPost.content.length
        ? `${snippet}...`
        : snippet;
    }

    // Fallback: reason label từ backend
    return item.reason_label ?? item.reasonLabel ?? item.reason ?? 'Trending gần bạn';
  }

  /** Thumbnail cho toast — ảnh địa điểm hoặc ảnh post. */
  get toastThumbUrl(): string | null {
    const item = this.toastItem;
    if (!item) return null;
    return item.thumbnailUrl ?? item.trendingPost?.media ?? null;
  }

  /** Chữ fallback khi không có thumbnail. */
  get toastThumbFallback(): string {
    const cat = this.toastItem?.category ?? '';
    const map: Record<string, string> = {
      food: 'PHO',
      cafe: 'CAFE',
      event: 'EVT',
      nightlife: 'BAR',
      campus: 'EDU',
    };
    return map[cat] ?? 'HOT';
  }

  get livePeople(): number {
    const total = this.nearby.reduce(
      (sum, p) => sum + (p.stats?.activeCount ?? 0), 0,
    );
    return total > 0 ? total : 1284;
  }

  get hotZones(): number {
    return this.trending.length > 0 ? this.trending.length : 18;
  }

  get nearbyPlaces(): number {
    return this.nearby.length > 0 ? this.nearby.length : 42;
  }

  get heatIndex(): number {
    const scores = this.trending
      .map((p) => p.trendScore ?? p.stats?.heatScore ?? 0)
      .filter((s) => s > 0);
    if (!scores.length) return 87;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // ─────────────────────────────── Lifecycle ──────────────────────────────────

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.stopRotate();
    this.clearMarkers();
    this.userMarker?.remove();
    this.map?.remove();
  }

  // ─────────────────────────────── Toast rotate ───────────────────────────────

  /** Bắt đầu auto-rotate toast sau khi có dữ liệu. */
  private startRotate(): void {
    if (this.trending.length < 2) return;
    this.stopRotate();
    this.rotateTimer = setInterval(() => this.nextToast(), TOAST_ROTATE_INTERVAL_MS);
  }

  private stopRotate(): void {
    if (this.rotateTimer) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = undefined;
    }
    if (this.animTimer) {
      clearTimeout(this.animTimer);
      this.animTimer = undefined;
    }
  }

  /** Chuyển sang item tiếp theo với animation slide. */
  private nextToast(): void {
    // Phase 1: slide cũ ra ngoài (200ms)
    this.toastAnim = 'exit';
    this.cdr.markForCheck();

    this.animTimer = setTimeout(() => {
      // Phase 2: đổi nội dung + slide mới vào (200ms)
      this.toastIndex = (this.toastIndex + 1) % this.trending.length;
      this.toastAnim = 'enter';
      this.cdr.markForCheck();

      this.animTimer = setTimeout(() => {
        this.toastAnim = 'idle';
        this.cdr.markForCheck();
      }, 220);
    }, 200);
  }

  /** Click vào toast → nhảy thủ công sang item tiếp theo. */
  onToastClick(): void {
    if (this.trending.length > 1) {
      this.stopRotate();
      this.nextToast();
      // Khởi động lại timer sau khi click
      this.animTimer = setTimeout(() => this.startRotate(), TOAST_ROTATE_INTERVAL_MS);
    }
    this.openPanel('trending');
  }

  // ─────────────────────────────── Map setup ──────────────────────────────────

  private initMap(): void {
    const center = this.mapState.getCenter();

    this.map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: this.styleUrl(),
      center: [center.lng, center.lat],
      zoom: this.mapState.getZoom(),
      pitch: 20,
      bearing: 0,
      attributionControl: false,
    });

    this.map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    );

    this.map.once('load', () => {
      this.publishViewport();
      this.loadSnapshot();
      this.loadPanels();
    });

    this.map.on('moveend', () => this.publishViewport());
    this.locateMe(true);
  }

  private styleUrl(): string {
    const style = this.isSatellite ? 'satellite-v1' : 'day-v1';
    return `https://maptiles.ndamaps.vn/styles/${style}/style.json?apikey=${environment.NDAMAPS_API_KEY}`;
  }

  toggleSatellite(): void {
    this.isSatellite = !this.isSatellite;
    this.map?.setStyle(this.styleUrl());
  }

  private publishViewport(): void {
    if (!this.map) return;
    const c = this.map.getCenter();
    const b = this.map.getBounds();
    const bbox: RlsBbox = {
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    };
    this.mapState.setViewport({
      center: { lat: c.lat, lng: c.lng },
      zoom: this.map.getZoom(),
      bounds: bbox,
    });
  }

  // ─────────────────────────────── Data loading ───────────────────────────────

  private bboxParam(): string | null {
    const b = this.mapState.getBounds();
    if (!b) return null;
    return `${b.minLng},${b.minLat},${b.maxLng},${b.maxLat}`;
  }

  private loadSnapshot(): void {
    const bbox = this.bboxParam();
    if (!bbox) return;
    this.api
      .get<RlsMapSnapshot>(RLS_API.MAP_BOOTSTRAP, {
        bbox,
        zoom: Math.round(this.mapState.getZoom()),
      })
      .pipe(catchError(() => of(null)))
      .subscribe((snapshot) => {
        if (!snapshot) return;
        const markers = (snapshot.markers ?? []).map((m) => this.toMapMarker(m));
        this.mapState.updateMarkers(markers);
        this.mapState.updateHeatPoints(snapshot.heatPoints ?? []);
        this.renderMarkers(markers);
      });
  }

  private loadPanels(): void {
    const center = this.mapState.getCenter();

    // Nearby
    this.loadingNearby = true;
    this.api
      .get<RlsNearbyLocation[]>(RLS_API.MAP_NEARBY, {
        lat: center.lat,
        lng: center.lng,
        radius: RLS_DEFAULT_RADIUS_M,
      })
      .pipe(catchError(() => of([] as RlsNearbyLocation[])))
      .subscribe((places) => {
        this.nearby = places ?? [];
        this.loadingNearby = false;
        // Render marker cho các nearby location chưa có trên map
        this.renderNearbyMarkers(this.nearby);
      });

    // Trending — gọi endpoint mới /trending/nearby (kèm post + active users)
    this.loadingTrending = true;
    this.api
      .get<RlsTrendingPlace[]>(RLS_API.TRENDING_NEARBY, {
        lat: center.lat,
        lng: center.lng,
        radius_m: RLS_DEFAULT_RADIUS_M,
        limit: 10,
      })
      .pipe(catchError(() => of([] as RlsTrendingPlace[])))
      .subscribe((items) => {
        this.trending = this.normalizeTrending(items ?? []);
        this.loadingTrending = false;
        this.toastIndex = 0;
        this.startRotate();
      });
  }

  /**
   * Chuẩn hoá response từ backend (snake_case → camelCase cho các field mới).
   */
  private normalizeTrending(raw: any[]): RlsTrendingPlace[] {
    return raw.map((item) => ({
      ...item,
      id: item.id ?? item.location_id,
      name: item.name,
      category: item.category,
      lat: item.lat,
      lng: item.lng,
      thumbnailUrl: item.thumbnail_url ?? item.thumbnailUrl ?? null,
      distanceM: item.distance_m ?? item.distanceM,
      trendScore: item.heat_score ?? item.trendScore,
      reason: item.reason ?? 'rising',
      reason_label: item.reason_label ?? item.reasonLabel,
      trendingPost: item.trending_post
        ? {
            id: item.trending_post.id,
            content: item.trending_post.content,
            reactionsCount: item.trending_post.reactions_count,
            commentsCount: item.trending_post.comments_count,
            media: item.trending_post.media ?? null,
            author: item.trending_post.author
              ? {
                  id: item.trending_post.author.id,
                  name: item.trending_post.author.name,
                  username: item.trending_post.author.username,
                  avatarUrl: item.trending_post.author.avatar_url ?? null,
                }
              : null,
            createdAt: item.trending_post.created_at,
          }
        : null,
      activeUsers: (item.active_users ?? []).map((u: any) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatarUrl: u.avatar_url ?? null,
      })),
      activeCount: item.active_count ?? 0,
      timeAgo: item.time_ago ?? null,
      stats: {
        activeCount: item.active_count ?? 0,
        heatScore: item.heat_score ?? 0,
      },
    }));
  }

  private toMapMarker(m: RlsMarker): RlsMapMarker {
    return {
      id: m.markerId,
      lat: m.lat,
      lng: m.lng,
      type: m.type,
      thumbnailUrl: m.thumbnailUrl,
      label: m.label,
      badge: m.badge,
      activityCount: m.activityCount,
    };
  }

  // ─────────────────────────────── Marker render ──────────────────────────────

  private renderMarkers(markers: RlsMapMarker[]): void {
    if (!this.map) return;
    this.clearMarkers();

    for (const marker of markers) {
      const count = marker.activityCount ?? 0;
      const isLive = count > 0;
      let el: HTMLCanvasElement;

      if (marker.type === 'user') {
        el = this.canvasMarker.drawUserMarker(marker.thumbnailUrl, isLive, 32);
      } else {
        el = this.canvasMarker.drawPlaceMarker(
          marker.type, marker.label, count, marker.thumbnailUrl,
        );
      }

      const m = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([marker.lng, marker.lat])
        .addTo(this.map);
      this.domMarkers.push(m);
    }
  }

  private clearMarkers(): void {
    for (const m of this.domMarkers) m.remove();
    this.domMarkers = [];
  }

  /**
   * Render marker cho các nearby location chưa có trên map.
   * Tránh duplicate bằng cách kiểm tra tọa độ đã có marker chưa.
   */
  private renderNearbyMarkers(places: RlsNearbyLocation[]): void {
    if (!this.map) return;

    // Tập hợp tọa độ đã có marker (từ snapshot)
    const existing = new Set(
      this.domMarkers.map((m) => {
        const ll = m.getLngLat();
        return `${ll.lat.toFixed(5)},${ll.lng.toFixed(5)}`;
      }),
    );

    for (const place of places) {
      const key = `${place.lat.toFixed(5)},${place.lng.toFixed(5)}`;
      if (existing.has(key)) continue; // đã có marker rồi, bỏ qua

      const count = place.stats?.activeCount ?? 0;
      const el = this.canvasMarker.drawPlaceMarker(
        place.category ?? 'default',
        place.name,
        count,
        place.thumbnailUrl ?? null,
      );

      const m = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([place.lng, place.lat])
        .addTo(this.map);
      this.domMarkers.push(m);
      existing.add(key);
    }
  }

  // ─────────────────────────────── UI handlers ────────────────────────────────

  selectTab(tab: RlsHomeTab): void {
    this.activeTab = tab;
  }

  openPanel(tab: RlsHomeTab = 'nearby'): void {
    this.activeTab = tab;
    this.panelOpen = true;
  }

  closePanel(): void {
    this.panelOpen = false;
  }

  onSelectPlace(place: { lat: number; lng: number }): void {
    this.flyTo(place.lat, place.lng);
  }

  onSearch(_query: string): void {
    // Geocoding sẽ nối khi endpoint sẵn sàng (R2.4).
  }

  locateMe(silent = false): void {
    if (!navigator.geolocation) return;
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating = false;
        const { latitude, longitude } = pos.coords;
        this.mapState.updateCenter(latitude, longitude);
        this.placeUserMarker(latitude, longitude);
        this.flyTo(latitude, longitude, RLS_MAP.DEFAULT_ZOOM);
      },
      () => { this.locating = false; },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  private placeUserMarker(lat: number, lng: number): void {
    if (!this.map) return;
    const el = this.canvasMarker.drawUserMarker(null, false, 32);
    if (this.userMarker) {
      this.userMarker.setLngLat([lng, lat]);
    } else {
      this.userMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(this.map);
    }
  }

  private flyTo(lat: number, lng: number, zoom?: number): void {
    this.map?.flyTo({
      center: [lng, lat],
      zoom: zoom ?? this.map.getZoom(),
      duration: 700,
    });
  }

  // ─────────────────────────────── Helpers ────────────────────────────────────

  /** Emoji theo category địa điểm. */
  categoryEmoji(category: string): string {
    const map: Record<string, string> = {
      food: '🍜',
      cafe: '☕',
      event: '🎉',
      nightlife: '🍻',
      campus: '🎓',
      other: '📍',
    };
    return map[category] ?? '📍';
  }
}
