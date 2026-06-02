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
  RLS_MAP,
} from '../../core/constants/rls-config.constants';
import {
  RlsBbox,
  RlsLocation,
  RlsNearbyLocation,
  RlsTrendingPlace,
} from '../../core/interfaces';
import { RlsSearchBarComponent } from '../../shared/components/rls-search-bar/rls-search-bar.component';
import { RlsNearbyPanelComponent } from '../../shared/components/rls-nearby-panel/rls-nearby-panel.component';
import { RlsTrendingPanelComponent } from '../../shared/components/rls-trending-panel/rls-trending-panel.component';
import { RlsMapCanvasService } from '../../core/services/rls-map-canvas.service';

interface RlsTooltipUser {
  name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
}

type RlsMapPlace = RlsTrendingPlace | RlsNearbyLocation;

interface RlsMapCluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  activeCount: number;
  places: RlsMapPlace[];
}

/** Tab Ä‘ang chá»n trong bottom sheet. */
type RlsHomeTab = 'nearby' | 'trending';

/** Khoáº£ng thá»i gian auto-rotate toast (ms). */
const TOAST_ROTATE_INTERVAL_MS = 4000;
const NEARBY_RADIUS_M = 5000;
const RADIUS_SOURCE_ID = 'rls-nearby-radius-source';
const RADIUS_FILL_LAYER_ID = 'rls-nearby-radius-fill';
const RADIUS_GLOW_LAYER_ID = 'rls-nearby-radius-glow';
const RADIUS_LINE_LAYER_ID = 'rls-nearby-radius-line';
const CLUSTER_SOURCE_ID = 'rls-map-clusters-source';
const CLUSTER_CIRCLE_LAYER_ID = 'rls-map-clusters-circle';
const CLUSTER_TEXT_LAYER_ID = 'rls-map-clusters-count';

/**
 * RlsHomeMapPage â€” mÃ n hÃ¬nh chÃ­nh cá»§a app-mini: báº£n Ä‘á»“ realtime toÃ n mÃ n hÃ¬nh.
 *
 * Toast "NEARBY TRENDING" á»Ÿ gÃ³c dÆ°á»›i trÃ¡i tá»± Ä‘á»™ng xoay vÃ²ng qua cÃ¡c trending
 * spots (quÃ¡n Äƒn, bÃ i post viral, ngÆ°á»i dÃ¹ng active) vá»›i animation slide.
 * Dá»¯ liá»‡u láº¥y tá»« `GET /trending/nearby` â€” backend tráº£ kÃ¨m trending_post +
 * active_users + reason_label cho má»—i spot.
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

  /** Tab hiá»‡n táº¡i cá»§a bottom sheet. */
  activeTab: RlsHomeTab = 'nearby';

  /** Drawer má»Ÿ/Ä‘Ã³ng. */
  panelOpen = false;

  /** Cháº¿ Ä‘á»™ vá»‡ tinh. */
  isSatellite = false;

  /** Äá»‹a Ä‘iá»ƒm Ä‘ang Ä‘Æ°á»£c chá»n (click marker). */
  selectedPlace: RlsTrendingPlace | RlsNearbyLocation | null = null;

  /** Vá»‹ trÃ­ pixel cá»§a tooltip trÃªn mÃ n hÃ¬nh. */
  tooltipPos: { x: number; y: number } | null = null;

  /** Tooltip Ä‘ang á»Ÿ tráº¡ng thÃ¡i expanded. */
  tooltipExpanded = false;

  /** Chi tiáº¿t Ä‘á»‹a Ä‘iá»ƒm Ä‘ang load (khi expand). */
  tooltipDetailLoading = false;

  /** Chi tiáº¿t Ä‘áº§y Ä‘á»§ tá»« API (khi expand). */
  tooltipDetail: any = null;

  drawerDetailPlace: RlsMapPlace | null = null;
  drawerDetailLoading = false;
  drawerDetail: any = null;

  /** Map lÆ°u data gá»‘c theo marker Ä‘á»ƒ tra cá»©u khi click. */
  private markerDataMap = new Map<maplibregl.Marker, RlsTrendingPlace | RlsNearbyLocation>();

  clusteringEnabled = true;
  visibleMarkerCount = 0;
  visibleClusterCount = 0;
  nearbyRadiusM = NEARBY_RADIUS_M;

  private readonly clusterPixelRadius = 170;
  private readonly maxVisibleMarkers = 90;
  private readonly autoClusterMinPlaces = 2;

  /** Tráº¡ng thÃ¡i náº¡p dá»¯ liá»‡u Ä‘á»ƒ hiá»‡n skeleton trong panel. */
  loadingNearby = false;
  loadingTrending = false;

  /** Äang Ä‘á»‹nh vá»‹ GPS. */
  locating = false;

  /** Dá»¯ liá»‡u hiá»ƒn thá»‹ trong panel. */
  nearby: RlsNearbyLocation[] = [];
  trending: RlsTrendingPlace[] = [];

  // â”€â”€ Toast auto-rotate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /** Index cá»§a item Ä‘ang hiá»ƒn thá»‹ trÃªn toast. */
  toastIndex = 0;

  /**
   * Tráº¡ng thÃ¡i animation: 'idle' | 'exit' | 'enter'.
   * - exit  â†’ slide ra ngoÃ i (cÅ©)
   * - enter â†’ slide vÃ o (má»›i)
   */
  toastAnim: 'idle' | 'exit' | 'enter' = 'idle';

  private rotateTimer?: ReturnType<typeof setInterval>;
  private animTimer?: ReturnType<typeof setTimeout>;

  // â”€â”€ Map internals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private map?: maplibregl.Map;
  private domMarkers: maplibregl.Marker[] = [];
  private userMarker?: maplibregl.Marker;
  private radiusCenter: { lat: number; lng: number } | null = null;
  private clusterDataMap = new Map<string, RlsMapCluster>();
  private clusterLayerEventsBound = false;

  private readonly handleClusterLayerClick = (event: any): void => {
    const clusterId = event.features?.[0]?.properties?.clusterId;
    if (!clusterId) return;
    const cluster = this.clusterDataMap.get(String(clusterId));
    if (cluster) this.openCluster(cluster);
  };

  private readonly handleClusterLayerMouseEnter = (): void => {
    if (this.map) this.map.getCanvas().style.cursor = 'pointer';
  };

  private readonly handleClusterLayerMouseLeave = (): void => {
    if (this.map) this.map.getCanvas().style.cursor = '';
  };

  constructor(
    private readonly api: RlsApiService,
    private readonly mapState: RlsMapService,
    private readonly canvasMarker: RlsMapCanvasService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  // â”€â”€ Getters cho template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Item trending Ä‘ang hiá»ƒn thá»‹ trÃªn toast. */
  get toastItem(): RlsTrendingPlace | null {
    return this.trending[this.toastIndex] ?? null;
  }

  /** NhÃ£n thá»i gian cá»§a toast item. */
  get toastTimeAgo(): string {
    return this.toastItem?.timeAgo ?? '2m ago';
  }

  /** TÃªn Ä‘á»‹a Ä‘iá»ƒm hiá»ƒn thá»‹ trÃªn toast. */
  get toastTitle(): string {
    const item = this.toastItem;
    if (!item) return 'Điểm đang hot gần bạn';
    const emoji = this.categoryEmoji(item.category);
    return emoji ? `${item.name} ${emoji}` : item.name;
  }

  /** DÃ²ng phá»¥ cá»§a toast â€” Æ°u tiÃªn: active users > trending post > reason label. */
  get toastSub(): string {
    const item = this.toastItem;
    if (!item) return 'Đang có hoạt động gần bạn';

    // CÃ³ ngÆ°á»i dÃ¹ng active â†’ hiá»‡n tÃªn + sá»‘ ngÆ°á»i
    if (item.activeUsers && item.activeUsers.length > 0) {
      const first = item.activeUsers[0];
      const rest = (item.activeCount ?? item.activeUsers.length) - 1;
      const name = first.username ? `@${first.username}` : (first.name ?? 'ai đó');
      return rest > 0
        ? `${name} đang ở đây cùng ${rest} người khác`
        : `${name} đang ở đây`;
    }

    // CÃ³ bÃ i post trending â†’ hiá»‡n snippet
    if (item.trendingPost?.content) {
      const snippet = item.trendingPost.content.slice(0, 50);
      return snippet.length < item.trendingPost.content.length
        ? `${snippet}...`
        : snippet;
    }

    // Fallback: reason label tá»« backend
    return item.reason_label ?? item.reasonLabel ?? item.reason ?? 'Trending gần bạn';
  }

  /** Thumbnail cho toast â€” áº£nh Ä‘á»‹a Ä‘iá»ƒm hoáº·c áº£nh post. */
  get toastThumbUrl(): string | null {
    const item = this.toastItem;
    if (!item) return null;
    return item.thumbnailUrl ?? item.trendingPost?.media ?? null;
  }

  /** Chá»¯ fallback khi khÃ´ng cÃ³ thumbnail. */
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.stopRotate();
    this.clearMarkers();
    this.unbindClusterLayerEvents();
    this.userMarker?.remove();
    this.map?.remove();
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Toast rotate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Báº¯t Ä‘áº§u auto-rotate toast sau khi cÃ³ dá»¯ liá»‡u. */
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

  /** Chuyá»ƒn sang item tiáº¿p theo vá»›i animation slide. */
  private nextToast(): void {
    // Phase 1: slide cÅ© ra ngoÃ i (200ms)
    this.toastAnim = 'exit';
    this.cdr.markForCheck();

    this.animTimer = setTimeout(() => {
      // Phase 2: Ä‘á»•i ná»™i dung + slide má»›i vÃ o (200ms)
      this.toastIndex = (this.toastIndex + 1) % this.trending.length;
      this.toastAnim = 'enter';
      this.cdr.markForCheck();

      this.animTimer = setTimeout(() => {
        this.toastAnim = 'idle';
        this.cdr.markForCheck();
      }, 220);
    }, 200);
  }

  /** Click vÃ o toast â†’ nháº£y thá»§ cÃ´ng sang item tiáº¿p theo. */
  onToastClick(): void {
    if (this.trending.length > 1) {
      this.stopRotate();
      this.nextToast();
      // Khá»Ÿi Ä‘á»™ng láº¡i timer sau khi click
      this.animTimer = setTimeout(() => this.startRotate(), TOAST_ROTATE_INTERVAL_MS);
    }
    this.openPanel('trending');
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Map setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      this.radiusCenter = this.mapState.getCenter();
      this.clearNearbyRadius();
      this.loadPanels();
    });

    this.map.on('moveend', () => this.onViewportChanged());
    this.locateMe(true);
  }

  private styleUrl(): string {
    const style = this.isSatellite ? 'satellite-v1' : 'day-v1';
    return `https://maptiles.ndamaps.vn/styles/${style}/style.json?apikey=${environment.NDAMAPS_API_KEY}`;
  }

  toggleSatellite(): void {
    if (!this.map) return;

    this.isSatellite = !this.isSatellite;
    this.unbindClusterLayerEvents();
    this.map.setStyle(this.styleUrl());
    this.map.once('style.load', () => {
      this.clearNearbyRadius();
      this.renderViewportMarkers();
    });
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

  private onViewportChanged(): void {
    this.publishViewport();
    this.renderViewportMarkers();
  }

  private clearNearbyRadius(): void {
    if (!this.map || !this.map.isStyleLoaded()) return;

    for (const layerId of [RADIUS_LINE_LAYER_ID, RADIUS_GLOW_LAYER_ID, RADIUS_FILL_LAYER_ID]) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    }

    if (this.map.getSource(RADIUS_SOURCE_ID)) {
      this.map.removeSource(RADIUS_SOURCE_ID);
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Data loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private loadPanels(): void {
    const center = this.mapState.getCenter();
    this.radiusCenter = center;
    this.clearNearbyRadius();

    // Nearby â€” bÃ¡n kÃ­nh 5km
    this.loadingNearby = true;
    this.api
      .get<RlsNearbyLocation[]>(RLS_API.MAP_NEARBY, {
        lat: center.lat,
        lng: center.lng,
        radius_m: NEARBY_RADIUS_M,
      })
      .pipe(catchError(() => of([] as RlsNearbyLocation[])))
      .subscribe((places) => {
        this.nearby = this.normalizeNearby(places ?? []);
        this.loadingNearby = false;
        this.renderViewportMarkers();
      });

    // Trending â€” khÃ´ng giá»›i háº¡n radius, láº¥y theo city/khu vá»±c rá»™ng
    this.loadingTrending = true;
    this.api
      .get<RlsTrendingPlace[]>(RLS_API.TRENDING_NEARBY, {
        lat: center.lat,
        lng: center.lng,
        limit: 10,
      })
      .pipe(catchError(() => of([] as RlsTrendingPlace[])))
      .subscribe((items) => {
        const normalized = this.normalizeTrending(items ?? []);
        this.trending = normalized;
        this.loadingTrending = false;
        this.toastIndex = 0;
        if (this.trending.length > 0) {
          // Trigger animation enter khi toast xuáº¥t hiá»‡n láº§n Ä‘áº§u
          this.toastAnim = 'enter';
          this.cdr.markForCheck();
          this.animTimer = setTimeout(() => {
            this.toastAnim = 'idle';
            this.cdr.markForCheck();
          }, 400);
          this.renderViewportMarkers();
          this.startRotate();
        }
      });
  }

  private normalizeNearby(raw: any[]): RlsNearbyLocation[] {
    return raw.map((item) => {
      const stats = item.stats ?? {};
      const activeCount =
        item.active_count ??
        item.activeCount ??
        stats.active_count ??
        stats.activeCount ??
        0;
      const heatScore =
        item.heat_score ??
        item.heatScore ??
        stats.heat_score ??
        stats.heatScore ??
        0;

      return {
        ...item,
        id: item.id ?? item.location_id,
        name: item.name,
        category: item.category ?? 'other',
        lat: Number(item.lat),
        lng: Number(item.lng),
        thumbnailUrl: this.readImageUrl(item),
        distanceM: Number(item.distance_m ?? item.distanceM ?? 0),
        stats: {
          ...stats,
          activeCount,
          heatScore,
        },
      } as RlsNearbyLocation;
    });
  }

  private normalizeTrending(raw: any[]): RlsTrendingPlace[] {
    return raw.map((item) => ({
      ...item,
      id: item.id ?? item.location_id,
      name: item.name,
      category: item.category,
      lat: Number(item.lat),
      lng: Number(item.lng),
      thumbnailUrl: this.readImageUrl(item),
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

  private readImageUrl(item: any): string | null {
    return (
      item.thumbnailUrl ??
      item.thumbnail_url ??
      item.imageUrl ??
      item.image_url ??
      item.photoUrl ??
      item.photo_url ??
      item.coverUrl ??
      item.cover_url ??
      item.mediaUrl ??
      item.media_url ??
      item.media ??
      null
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Marker render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private clearMarkers(closeTooltip = true): void {
    for (const m of this.domMarkers) m.remove();
    this.domMarkers = [];
    this.markerDataMap.clear();
    this.clusterDataMap.clear();
    this.visibleMarkerCount = 0;
    this.visibleClusterCount = 0;
    if (closeTooltip) {
      this.closeTooltip();
    }
  }

  private renderViewportMarkers(): void {
    if (!this.map) return;

    const visible = this.getVisiblePlaces();
    const shouldCluster =
      this.clusteringEnabled &&
      (visible.length >= this.autoClusterMinPlaces || this.map.getZoom() < 16.5);

    this.clearMarkers(false);
    const visibleClusters: RlsMapCluster[] = [];

    if (shouldCluster) {
      const clusters = this.buildClusters(visible);
      for (const cluster of clusters) {
        if (cluster.count > 1) {
          visibleClusters.push(cluster);
        } else {
          this.renderPlaceMarker(cluster.places[0]);
        }
      }
    } else {
      for (const place of visible.slice(0, this.maxVisibleMarkers)) {
        this.renderPlaceMarker(place);
      }
    }

    this.renderClusterLayer(visibleClusters);
    this.cdr.markForCheck();
  }

  private getVisiblePlaces(): RlsMapPlace[] {
    if (!this.map) return [];

    const bounds = this.map.getBounds();
    const seen = new Set<string>();
    const merged = [...this.trending, ...this.nearby]
      .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
      .filter((place) => bounds.contains([place.lng, place.lat] as [number, number]))
      .sort((a, b) => this.placeScore(b) - this.placeScore(a));

    const unique: RlsMapPlace[] = [];
    for (const place of merged) {
      const key = this.placeKey(place);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(place);
    }

    return unique;
  }

  private buildClusters(places: RlsMapPlace[]): RlsMapCluster[] {
    if (!this.map) return [];

    const clusters: Array<RlsMapCluster & { x: number; y: number }> = [];

    for (const place of places) {
      const point = this.map.project([place.lng, place.lat]);
      let target: (RlsMapCluster & { x: number; y: number }) | null = null;

      for (const cluster of clusters) {
        const dx = cluster.x - point.x;
        const dy = cluster.y - point.y;
        if (Math.sqrt(dx * dx + dy * dy) <= this.clusterPixelRadius) {
          target = cluster;
          break;
        }
      }

      if (!target) {
        clusters.push({
          id: `cluster-${clusters.length}`,
          lat: place.lat,
          lng: place.lng,
          x: point.x,
          y: point.y,
          count: 1,
          activeCount: this.placeActiveCount(place),
          places: [place],
        });
        continue;
      }

      target.places.push(place);
      target.count = target.places.length;
      target.activeCount += this.placeActiveCount(place);
      target.lat = target.places.reduce((sum, p) => sum + p.lat, 0) / target.count;
      target.lng = target.places.reduce((sum, p) => sum + p.lng, 0) / target.count;
      const nextPoint = this.map.project([target.lng, target.lat]);
      target.x = nextPoint.x;
      target.y = nextPoint.y;
    }

    return clusters.map(({ x, y, ...cluster }) => cluster);
  }

  private renderPlaceMarker(place: RlsMapPlace): void {
    if (!this.map) return;

    const count = this.placeActiveCount(place);
    const el = this.canvasMarker.drawPlaceMarker(
      place.category ?? 'default',
      place.name,
      count,
      place.thumbnailUrl ?? null,
    );

    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([place.lng, place.lat])
      .addTo(this.map);

    this.domMarkers.push(marker);
    this.markerDataMap.set(marker, place);
    this.visibleMarkerCount += 1;

    el.addEventListener('click', (event) => {
      event.stopPropagation();
      this.onMarkerClick(marker, place);
    });
  }

  private renderClusterLayer(clusters: RlsMapCluster[]): void {
    if (!this.map || !this.map.isStyleLoaded()) return;

    this.clusterDataMap.clear();
    this.visibleClusterCount = clusters.length;
    const source = this.map.getSource(CLUSTER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

    if (!clusters.length) {
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      return;
    }

    const data = this.createClusterFeatureCollection(clusters);

    if (source) {
      source.setData(data);
    } else {
      this.map.addSource(CLUSTER_SOURCE_ID, {
        type: 'geojson',
        data,
      });
    }

    if (!this.map.getLayer(CLUSTER_CIRCLE_LAYER_ID)) {
      this.map.addLayer({
        id: CLUSTER_CIRCLE_LAYER_ID,
        type: 'circle',
        source: CLUSTER_SOURCE_ID,
        paint: {
          'circle-radius': [
            'step',
            ['get', 'count'],
            19,
            8,
            21,
            18,
            24,
            40,
            27,
          ],
          'circle-color': [
            'step',
            ['get', 'count'],
            '#22d3ee',
            18,
            '#fb923c',
            40,
            '#ef4444',
          ],
          'circle-opacity': 0.96,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-stroke-opacity': 0.9,
        },
      });
    }

    if (!this.map.getLayer(CLUSTER_TEXT_LAYER_ID)) {
      this.map.addLayer({
        id: CLUSTER_TEXT_LAYER_ID,
        type: 'symbol',
        source: CLUSTER_SOURCE_ID,
        layout: {
          'text-field': ['get', 'countLabel'],
          'text-size': 14,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0, 0, 0, 0.32)',
          'text-halo-width': 1.2,
        },
      });
    }

    this.bindClusterLayerEvents();
  }

  private createClusterFeatureCollection(
    clusters: RlsMapCluster[],
  ): GeoJSON.FeatureCollection<GeoJSON.Point> {
    return {
      type: 'FeatureCollection',
      features: clusters.map((cluster) => {
        this.clusterDataMap.set(cluster.id, cluster);
        return {
          type: 'Feature' as const,
          properties: {
            clusterId: cluster.id,
            count: cluster.count,
            countLabel: cluster.count > 99 ? '99+' : String(cluster.count),
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [cluster.lng, cluster.lat],
          },
        };
      }),
    };
  }

  private renderClusterMarker(cluster: RlsMapCluster): void {
    if (!this.map) return;

    const el = this.createClusterElement(cluster);
    const marker = new maplibregl.Marker({
      element: el,
      anchor: 'center',
      pitchAlignment: 'viewport',
      rotationAlignment: 'viewport',
    })
      .setLngLat([cluster.lng, cluster.lat])
      .addTo(this.map);

    this.domMarkers.push(marker);
    this.visibleClusterCount += 1;

    el.addEventListener('click', (event) => {
      event.stopPropagation();
      this.openCluster(cluster);
    });
  }

  private createClusterElement(cluster: RlsMapCluster): HTMLElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'rls-map-cluster';
    el.setAttribute('aria-label', `Cụm ${cluster.count} địa điểm`);

    const sizeClass = cluster.count >= 40 ? 'is-xl' : cluster.count >= 18 ? 'is-lg' : cluster.count >= 8 ? 'is-md' : 'is-sm';
    el.classList.add(sizeClass);

    const count = document.createElement('span');
    count.className = 'rls-map-cluster__count';
    count.textContent = cluster.count > 99 ? '99+' : String(cluster.count);

    el.append(count);
    return el;
  }

  private clearClusterLayer(): void {
    if (!this.map || !this.map.isStyleLoaded()) return;

    this.unbindClusterLayerEvents();

    for (const layerId of [CLUSTER_TEXT_LAYER_ID, CLUSTER_CIRCLE_LAYER_ID]) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    }

    if (this.map.getSource(CLUSTER_SOURCE_ID)) {
      this.map.removeSource(CLUSTER_SOURCE_ID);
    }
  }

  private bindClusterLayerEvents(): void {
    if (!this.map || this.clusterLayerEventsBound) return;
    if (!this.map.getLayer(CLUSTER_CIRCLE_LAYER_ID) || !this.map.getLayer(CLUSTER_TEXT_LAYER_ID)) return;

    this.map.on('click', CLUSTER_CIRCLE_LAYER_ID, this.handleClusterLayerClick);
    this.map.on('click', CLUSTER_TEXT_LAYER_ID, this.handleClusterLayerClick);
    this.map.on('mouseenter', CLUSTER_CIRCLE_LAYER_ID, this.handleClusterLayerMouseEnter);
    this.map.on('mouseenter', CLUSTER_TEXT_LAYER_ID, this.handleClusterLayerMouseEnter);
    this.map.on('mouseleave', CLUSTER_CIRCLE_LAYER_ID, this.handleClusterLayerMouseLeave);
    this.map.on('mouseleave', CLUSTER_TEXT_LAYER_ID, this.handleClusterLayerMouseLeave);
    this.clusterLayerEventsBound = true;
  }

  private unbindClusterLayerEvents(): void {
    if (!this.map || !this.clusterLayerEventsBound) return;

    for (const layerId of [CLUSTER_CIRCLE_LAYER_ID, CLUSTER_TEXT_LAYER_ID]) {
      try {
        this.map.off('click', layerId, this.handleClusterLayerClick);
        this.map.off('mouseenter', layerId, this.handleClusterLayerMouseEnter);
        this.map.off('mouseleave', layerId, this.handleClusterLayerMouseLeave);
      } catch {
        // Layer có thể đã bị xoá khi đổi style; bỏ qua để cleanup an toàn.
      }
    }

    this.clusterLayerEventsBound = false;
    this.handleClusterLayerMouseLeave();
  }

  private openCluster(cluster: RlsMapCluster): void {
    if (!this.map) return;
    this.closeTooltip();
    this.map.easeTo({
      center: [cluster.lng, cluster.lat],
      zoom: Math.min(18.6, this.map.getZoom() + 1.7),
      duration: 520,
    });
  }

  private placeKey(place: RlsMapPlace): string {
    return place.id
      ? `id-${place.id}`
      : `ll-${place.lat.toFixed(5)}-${place.lng.toFixed(5)}`;
  }

  private placeActiveCount(place: RlsMapPlace): number {
    const trending = place as RlsTrendingPlace;
    return trending.activeCount ?? place.stats?.activeCount ?? 0;
  }

  private placeScore(place: RlsMapPlace): number {
    const trending = place as RlsTrendingPlace;
    return (trending.trendScore ?? place.stats?.heatScore ?? 0) * 10 + this.placeActiveCount(place);
  }
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ UI handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  toggleClustering(): void {
    this.clusteringEnabled = !this.clusteringEnabled;
    this.closeTooltip();
    this.renderViewportMarkers();
  }

  splitClusters(): void {
    if (!this.map) return;

    if (!this.clusteringEnabled) {
      this.clusteringEnabled = true;
      this.renderViewportMarkers();
      return;
    }

    this.closeTooltip();
    this.map.easeTo({
      zoom: Math.min(18.6, this.map.getZoom() + 1.5),
      duration: 520,
    });
  }

  selectTab(tab: RlsHomeTab): void {
    this.activeTab = tab;
  }

  openPanel(tab: RlsHomeTab = 'nearby'): void {
    this.activeTab = tab;
    this.panelOpen = true;
    this.closeTooltip();
  }

  closePanel(): void {
    this.panelOpen = false;
  }

  /** Click vÃ o marker â†’ hiá»‡n tooltip táº¡i vá»‹ trÃ­ pixel cá»§a marker. */
  onMarkerClick(marker: maplibregl.Marker, place: RlsTrendingPlace | RlsNearbyLocation): void {
    if (!this.map) return;
    const ll = marker.getLngLat();
    const pos = this.map.project([ll.lng, ll.lat]);
    this.selectedPlace = place;
    this.tooltipPos = { x: pos.x, y: pos.y };
    this.cdr.markForCheck();

    // Cáº­p nháº­t vá»‹ trÃ­ tooltip khi map di chuyá»ƒn
    this.map.once('movestart', () => this.closeTooltip());
  }

  closeTooltip(): void {
    this.selectedPlace = null;
    this.tooltipPos = null;
    this.tooltipExpanded = false;
    this.tooltipDetail = null;
    this.tooltipDetailLoading = false;
    this.cdr.markForCheck();
  }

  /** Expand tooltip â€” load chi tiáº¿t tá»« API náº¿u chÆ°a cÃ³. */
  expandTooltip(): void {
    if (!this.selectedPlace) return;
    this.tooltipExpanded = true;

    // Náº¿u Ä‘Ã£ cÃ³ data tá»« trending (cÃ³ trendingPost/activeUsers) thÃ¬ dÃ¹ng luÃ´n
    const place = this.selectedPlace as RlsTrendingPlace;
    if (place.trendingPost || (place.activeUsers && place.activeUsers.length > 0)) {
      this.tooltipDetail = place;
      this.cdr.markForCheck();
      return;
    }

    // Gá»i API láº¥y chi tiáº¿t
    this.tooltipDetailLoading = true;
    const detailPath = RLS_API.LOCATION_DETAIL.replace(':id', String(this.selectedPlace.id));
    this.api
      .get<any>(detailPath)
      .pipe(catchError(() => of(null)))
      .subscribe((detail) => {
        this.tooltipDetail = detail ?? this.selectedPlace;
        this.tooltipDetailLoading = false;
        this.cdr.markForCheck();
      });
  }

  /** Sá»‘ ngÆ°á»i active cho tooltip. */
  get tooltipActiveCount(): number {
    const p = this.selectedPlace as any;
    return p?.activeCount ?? p?.stats?.activeCount ?? 0;
  }

  /** Reason label cho tooltip. */
  get tooltipReasonLabel(): string {
    const p = this.selectedPlace as any;
    return p?.reason_label ?? p?.reasonLabel ?? '';
  }

  get tooltipVisibleActiveUsers(): RlsTooltipUser[] {
    const users = this.tooltipDetail?.active_users ?? this.tooltipDetail?.activeUsers;
    return Array.isArray(users) ? users.slice(0, 4) : [];
  }

  tooltipUserName(user: RlsTooltipUser): string {
    return user.name || user.username || 'Người dùng';
  }

  tooltipUserAvatar(user: RlsTooltipUser): string | null {
    return user.avatar_url || user.avatarUrl || null;
  }

  tooltipUserInitial(user: RlsTooltipUser): string {
    return this.tooltipUserName(user).charAt(0).toUpperCase();
  }

  get drawerDetailThumbUrl(): string | null {
    const source = (this.drawerDetail ?? this.drawerDetailPlace) as any;
    const post = source?.trending_post ?? source?.trendingPost;
    return (
      source?.thumbnailUrl ??
      source?.thumbnail_url ??
      source?.imageUrl ??
      source?.image_url ??
      source?.photoUrl ??
      source?.photo_url ??
      source?.coverUrl ??
      source?.cover_url ??
      post?.media ??
      null
    );
  }

  get drawerDetailActiveCount(): number {
    const source = (this.drawerDetail ?? this.drawerDetailPlace) as any;
    return source?.active_count ?? source?.activeCount ?? source?.stats?.activeCount ?? 0;
  }

  get drawerDetailReasonLabel(): string {
    const source = (this.drawerDetail ?? this.drawerDetailPlace) as any;
    return source?.reason_label ?? source?.reasonLabel ?? '';
  }

  get drawerDetailPost(): any {
    const source = (this.drawerDetail ?? this.drawerDetailPlace) as any;
    return source?.trending_post ?? source?.trendingPost ?? null;
  }

  get drawerVisibleActiveUsers(): RlsTooltipUser[] {
    const source = (this.drawerDetail ?? this.drawerDetailPlace) as any;
    const users = source?.active_users ?? source?.activeUsers;
    return Array.isArray(users) ? users.slice(0, 4) : [];
  }

  closeDrawerDetail(): void {
    this.drawerDetailPlace = null;
    this.drawerDetail = null;
    this.drawerDetailLoading = false;
    this.cdr.markForCheck();
  }

  onSelectPlace(place: RlsLocation): void {
    this.closeTooltip();
    this.flyTo(place.lat, place.lng);
    this.panelOpen = true;
    this.openDrawerDetail(place as RlsMapPlace);
  }

  private openDrawerDetail(place: RlsMapPlace): void {
    this.drawerDetailPlace = place;
    this.drawerDetail = null;
    this.drawerDetailLoading = false;

    const trending = place as RlsTrendingPlace;
    if (trending.trendingPost || (trending.activeUsers && trending.activeUsers.length > 0)) {
      this.drawerDetail = place;
      this.cdr.markForCheck();
      return;
    }

    this.drawerDetailLoading = true;
    const detailPath = RLS_API.LOCATION_DETAIL.replace(':id', String(place.id));
    this.api
      .get<any>(detailPath)
      .pipe(catchError(() => of(null)))
      .subscribe((detail) => {
        if (this.drawerDetailPlace?.id !== place.id) return;
        this.drawerDetail = detail ?? place;
        this.drawerDetailLoading = false;
        this.cdr.markForCheck();
      });

    this.cdr.markForCheck();
  }

  onSearch(_query: string): void {
    // Geocoding sáº½ ná»‘i khi endpoint sáºµn sÃ ng (R2.4).
  }

  locateMe(silent = false): void {
    if (!navigator.geolocation) {
      const current = this.userMarker?.getLngLat();
      if (current) this.flyTo(current.lat, current.lng, RLS_MAP.DEFAULT_ZOOM);
      return;
    }
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating = false;
        const { latitude, longitude } = pos.coords;
        if (!silent) {
          this.closePanel();
          this.closeTooltip();
        }
        this.mapState.updateCenter(latitude, longitude);
        this.radiusCenter = { lat: latitude, lng: longitude };
        this.placeUserMarker(latitude, longitude);
        this.clearNearbyRadius();
        this.flyTo(latitude, longitude, RLS_MAP.DEFAULT_ZOOM);
        this.loadPanels();
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Emoji theo category Ä‘á»‹a Ä‘iá»ƒm. */
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

  /**
   * Fallback mock data khi API chÆ°a sáºµn sÃ ng hoáº·c chÆ°a Ä‘Äƒng nháº­p.
   * Äá»§ ná»™i dung Ä‘á»ƒ toast auto-rotate hoáº¡t Ä‘á»™ng ngay láº­p tá»©c.
   */
  private mockTrendingFallback(): RlsTrendingPlace[] {
    return [
      {
        id: 1, name: 'Phá»Ÿ BÃ¡t ÄÃ n', category: 'food',
        lat: 21.0338, lng: 105.8490,
        thumbnailUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
        reason: 'crowded', reason_label: '4 ngÆ°á»i Ä‘ang á»Ÿ Ä‘Ã¢y',
        timeAgo: '5m ago', activeCount: 4,
        activeUsers: [
          { id: 3, name: 'Linh Tráº§n', username: 'linh_tran', avatarUrl: 'https://i.pravatar.cc/150?img=5' },
          { id: 4, name: 'HÃ¹ng Pháº¡m', username: 'hung_pham', avatarUrl: 'https://i.pravatar.cc/150?img=7' },
        ],
        trendingPost: {
          id: 1, content: 'Phá»Ÿ BÃ¡t ÄÃ n sÃ¡ng nay Ä‘Ã´ng kinh khá»§ng nhÆ°ng xá»©ng Ä‘Ã¡ng chá» ðŸœ NÆ°á»›c dÃ¹ng trong váº¯t, thá»‹t má»m tan.',
          reactionsCount: 47, commentsCount: 12,
          media: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
          author: { id: 3, name: 'Linh Tráº§n', username: 'linh_tran', avatarUrl: 'https://i.pravatar.cc/150?img=5' },
          createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
        },
        trendScore: 28, distanceM: 420, stats: { activeCount: 4, heatScore: 28 },
      },
      {
        id: 2, name: 'CÃ  PhÃª Trá»©ng Giáº£ng', category: 'cafe',
        lat: 21.0348, lng: 105.8498,
        thumbnailUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
        reason: 'viral', reason_label: 'Äang lan truyá»n ðŸ”¥',
        timeAgo: '12m ago', activeCount: 3,
        activeUsers: [
          { id: 4, name: 'HÃ¹ng Pháº¡m', username: 'hung_pham', avatarUrl: 'https://i.pravatar.cc/150?img=7' },
        ],
        trendingPost: {
          id: 2, content: 'CÃ  phÃª trá»©ng Giáº£ng â€” uá»‘ng má»™t láº§n lÃ  nghiá»‡n â˜• Lá»›p kem trá»©ng bÃ©o ngáº­y, cÃ  phÃª Ä‘áº¯ng vá»«a pháº£i.',
          reactionsCount: 38, commentsCount: 9,
          media: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',
          author: { id: 4, name: 'HÃ¹ng Pháº¡m', username: 'hung_pham', avatarUrl: 'https://i.pravatar.cc/150?img=7' },
          createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
        },
        trendScore: 24, distanceM: 380, stats: { activeCount: 3, heatScore: 24 },
      },
      {
        id: 3, name: 'Indie Night Yard', category: 'event',
        lat: 21.0258, lng: 105.8408,
        thumbnailUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400',
        reason: 'event', reason_label: 'CÃ³ sá»± kiá»‡n Ä‘ang diá»…n ra ðŸŽ‰',
        timeAgo: '8m ago', activeCount: 5,
        activeUsers: [
          { id: 2, name: 'Minh Nguyen', username: 'minh_nguyen', avatarUrl: 'https://i.pravatar.cc/150?img=3' },
          { id: 5, name: 'Mai LÃª', username: 'mai_le', avatarUrl: 'https://i.pravatar.cc/150?img=9' },
        ],
        trendingPost: {
          id: 9, content: 'Indie Night Yard tá»‘i nay cÃ³ Open Mic ðŸŽ¸ Äáº¿n sá»›m Ä‘á»ƒ cÃ³ chá»— ngá»“i Ä‘áº¹p. Free entry!',
          reactionsCount: 62, commentsCount: 21,
          media: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600',
          author: { id: 2, name: 'Minh Nguyen', username: 'minh_nguyen', avatarUrl: 'https://i.pravatar.cc/150?img=3' },
          createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
        },
        trendScore: 35, distanceM: 650, stats: { activeCount: 5, heatScore: 35 },
      },
      {
        id: 4, name: 'The Note Coffee', category: 'cafe',
        lat: 21.0330, lng: 105.8510,
        thumbnailUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400',
        reason: 'viral', reason_label: 'Äang lan truyá»n ðŸ”¥',
        timeAgo: '30m ago', activeCount: 2,
        activeUsers: [
          { id: 6, name: 'Tuáº¥n VÅ©', username: 'tuan_vu', avatarUrl: 'https://i.pravatar.cc/150?img=11' },
        ],
        trendingPost: {
          id: 4, content: 'The Note Coffee â€” hÃ ng nghÃ¬n tá» note dÃ¡n kÃ­n tráº§n nhÃ  ðŸ“ KhÃ´ng gian cá»±c ká»³ Ä‘á»™c Ä‘Ã¡o!',
          reactionsCount: 55, commentsCount: 18,
          media: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600',
          author: { id: 5, name: 'Tuáº¥n VÅ©', username: 'tuan_vu', avatarUrl: 'https://i.pravatar.cc/150?img=11' },
          createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
        },
        trendScore: 20, distanceM: 510, stats: { activeCount: 2, heatScore: 20 },
      },
      {
        id: 5, name: 'HÃ  Ná»™i Rock City', category: 'nightlife',
        lat: 21.0275, lng: 105.8420,
        thumbnailUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400',
        reason: 'crowded', reason_label: '3 ngÆ°á»i Ä‘ang á»Ÿ Ä‘Ã¢y',
        timeAgo: '25m ago', activeCount: 3,
        activeUsers: [
          { name: 'Nam BÃ¹i', username: 'nam_bui', avatarUrl: 'https://i.pravatar.cc/150?img=15' },
        ],
        trendingPost: {
          id: 6, content: 'HÃ  Ná»™i Rock City tá»‘i qua chÃ¡y quÃ¡ ðŸ”¥ Ban nháº¡c NgÅ© Cung chÆ¡i live cá»±c Ä‘á»‰nh!',
          reactionsCount: 41, commentsCount: 14,
          media: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600',
          author: { id: 7, name: 'Nam BÃ¹i', username: 'nam_bui', avatarUrl: 'https://i.pravatar.cc/150?img=15' },
          createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
        },
        trendScore: 18, distanceM: 720, stats: { activeCount: 3, heatScore: 18 },
      },
      {
        id: 6, name: 'BÃºn Cháº£ HÃ ng MÃ nh', category: 'food',
        lat: 21.0312, lng: 105.8478,
        thumbnailUrl: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400',
        reason: 'rising', reason_label: 'Äang ná»•i lÃªn â¬†ï¸',
        timeAgo: '20m ago', activeCount: 2,
        activeUsers: [
          { name: 'Mai LÃª', username: 'mai_le', avatarUrl: 'https://i.pravatar.cc/150?img=9' },
        ],
        trendingPost: {
          id: 3, content: 'BÃºn cháº£ HÃ ng MÃ nh â€” Obama tá»«ng Äƒn á»Ÿ Ä‘Ã¢y vÃ  mÃ¬nh hiá»ƒu táº¡i sao ðŸ˜„',
          reactionsCount: 29, commentsCount: 7,
          media: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600',
          author: { id: 5, name: 'Mai LÃª', username: 'mai_le', avatarUrl: 'https://i.pravatar.cc/150?img=9' },
          createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
        },
        trendScore: 15, distanceM: 580, stats: { activeCount: 2, heatScore: 15 },
      },
    ];
  }
}


