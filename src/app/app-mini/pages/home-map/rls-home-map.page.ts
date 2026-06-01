import {
  AfterViewInit,
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

/** Tab đang chọn trong bottom sheet. */
type RlsHomeTab = 'nearby' | 'trending';

/**
 * RlsHomeMapPage — màn hình chính của app-mini: bản đồ realtime toàn màn hình
 * (design.md §9.6, task 5.2).
 *
 * Luồng khởi động (design.md §9.6 "mở app → thấy bản đồ ngay"):
 *  1. Khởi tạo MapLibre map ngay với center mặc định (Hà Nội) — không chờ GPS.
 *  2. Lấy vị trí thực song song → recenter nếu người dùng cho phép (R2.1, R2.3).
 *  3. Gọi `GET /map/bootstrap` lấy snapshot markers + heat → render ngay (R2.2).
 *  4. Mỗi lần pan/zoom (debounce qua `RlsMapService`) → refetch theo bbox mới.
 *  5. Bottom sheet hiển thị "gần bạn" + "trending".
 *
 * Backend map endpoints có thể chưa sẵn sàng (đang phát triển) → mọi lời gọi
 * HTTP đều `catchError` về rỗng để bản đồ vẫn hiển thị và panel hiện empty state
 * thay vì vỡ trang. URL host lấy từ `API_URL`/`environment.ts` (R14.3).
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

  /** Đang định vị GPS (hiện trạng thái nút locate). */
  locating = false;

  /** Dữ liệu hiển thị trong panel. */
  nearby: RlsNearbyLocation[] = [];
  trending: RlsTrendingPlace[] = [];

  private map?: maplibregl.Map;
  private domMarkers: maplibregl.Marker[] = [];

  constructor(
    private readonly api: RlsApiService,
    private readonly mapState: RlsMapService,
  ) {}

  get livePeople(): number {
    const total = this.nearby.reduce(
      (sum, place) => sum + (place.stats?.activeCount ?? 0),
      0,
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
      .map((place) => place.trendScore ?? place.stats?.heatScore ?? 0)
      .filter((score) => score > 0);
    if (scores.length === 0) {
      return 87;
    }
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  // ─────────────────────────────── Lifecycle ──────────────────────────────────

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.clearMarkers();
    this.map?.remove();
  }

  // ─────────────────────────────── Map setup ──────────────────────────────────

  private initMap(): void {
    const center = this.mapState.getCenter();

    this.map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: this.styleUrl(),
      center: [center.lng, center.lat],
      zoom: this.mapState.getZoom(),
      pitch: 20,          // nghiêng 20° mặc định (3D nhẹ)
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

    // Pan/zoom xong → đẩy viewport vào RlsMapService (debounce) để refetch.
    this.map.on('moveend', () => this.publishViewport());

    // Định vị thực song song, không chặn render map (R2.1).
    this.locateMe(true);
  }

  /** Style bản đồ (NDAMaps) — day hoặc satellite. */
  private styleUrl(): string {
    const style = this.isSatellite ? 'satellite-v1' : 'day-v1';
    return `https://maptiles.ndamaps.vn/styles/${style}/style.json?apikey=${environment.NDAMAPS_API_KEY}`;
  }

  /** Bật/tắt chế độ vệ tinh. */
  toggleSatellite(): void {
    this.isSatellite = !this.isSatellite;
    this.map?.setStyle(this.styleUrl());
  }

  /** Đẩy center/zoom/bbox hiện tại của map vào state service (kích hoạt refetch). */
  private publishViewport(): void {
    if (!this.map) {
      return;
    }
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

  /** Chuỗi bbox "minLng,minLat,maxLng,maxLat" cho query map. */
  private bboxParam(): string | null {
    const b = this.mapState.getBounds();
    if (!b) {
      return null;
    }
    return `${b.minLng},${b.minLat},${b.maxLng},${b.maxLat}`;
  }

  /** Tải snapshot markers + heat trong viewport rồi render lên bản đồ. */
  private loadSnapshot(): void {
    const bbox = this.bboxParam();
    if (!bbox) {
      return;
    }
    this.api
      .get<RlsMapSnapshot>(RLS_API.MAP_BOOTSTRAP, {
        bbox,
        zoom: Math.round(this.mapState.getZoom()),
      })
      .pipe(catchError(() => of(null)))
      .subscribe((snapshot) => {
        if (!snapshot) {
          return;
        }
        const markers = (snapshot.markers ?? []).map((m) =>
          this.toMapMarker(m),
        );
        this.mapState.updateMarkers(markers);
        this.mapState.updateHeatPoints(snapshot.heatPoints ?? []);
        this.renderMarkers(markers);
      });
  }

  /** Tải danh sách "gần bạn" + "trending" cho bottom sheet. */
  private loadPanels(): void {
    const center = this.mapState.getCenter();

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
      });

    this.loadingTrending = true;
    this.api
      .get<RlsTrendingPlace[]>(RLS_API.TRENDING_NEARBY, {
        lat: center.lat,
        lng: center.lng,
      })
      .pipe(catchError(() => of([] as RlsTrendingPlace[])))
      .subscribe((items) => {
        this.trending = items ?? [];
        this.loadingTrending = false;
      });
  }

  /** Chuẩn hoá marker nghiệp vụ (API) → marker render trên bản đồ. */
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
    if (!this.map) {
      return;
    }
    this.clearMarkers();
    for (const marker of markers) {
      const el = document.createElement('div');
      el.className = `rls-map-marker rls-map-marker-${marker.type}`;
      const count = marker.activityCount ?? 0;
      const isLive = count > 0;
      if (isLive) {
        el.classList.add('is-active');
      }

      // Avatar: ảnh thumbnail nếu có, fallback dot
      const avatarInner = marker.thumbnailUrl
        ? `<img src="${marker.thumbnailUrl}" alt="${marker.label ?? ''}" loading="lazy" />`
        : `<span class="rls-map-marker-dot"></span>`;

      // Badge LIVE nếu đang có người
      const liveBadge = isLive
        ? `<span class="rls-map-marker-live">LIVE</span>`
        : '';

      // Badge số người nếu > 1
      const countBadge = count > 1
        ? `<span class="rls-map-marker-count">${count > 99 ? '99+' : count}</span>`
        : '';

      // Label tên địa điểm
      const label = marker.label
        ? `<span class="rls-map-marker-label">${marker.label}</span>`
        : '';

      el.innerHTML = `
        <div class="rls-map-marker-avatar">
          ${avatarInner}
          ${liveBadge}
          ${countBadge}
        </div>
        ${label}
      `;

      const m = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([marker.lng, marker.lat])
        .addTo(this.map);
      this.domMarkers.push(m);
    }
  }

  private clearMarkers(): void {
    for (const m of this.domMarkers) {
      m.remove();
    }
    this.domMarkers = [];
  }

  // ─────────────────────────────── UI handlers ────────────────────────────────

  /** Chuyển tab nearby/trending. */
  selectTab(tab: RlsHomeTab): void {
    this.activeTab = tab;
  }

  /** Mở drawer và chọn tab. */
  openPanel(tab: RlsHomeTab = 'nearby'): void {
    this.activeTab = tab;
    this.panelOpen = true;
  }

  /** Đóng drawer. */
  closePanel(): void {
    this.panelOpen = false;
  }

  /** Người dùng chọn một địa điểm trong panel → recenter map. */
  onSelectPlace(place: { lat: number; lng: number }): void {
    this.flyTo(place.lat, place.lng);
  }

  /** Tìm kiếm (debounce ở component) — TODO geocoding khi backend sẵn sàng. */
  onSearch(_query: string): void {
    // Geocoding/search sẽ nối khi endpoint sẵn sàng (R2.4).
  }

  /** Lấy vị trí hiện tại và recenter bản đồ (R2.1). */
  locateMe(silent = false): void {
    if (!navigator.geolocation) {
      return;
    }
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating = false;
        const { latitude, longitude } = pos.coords;
        this.mapState.updateCenter(latitude, longitude);
        this.flyTo(latitude, longitude, RLS_MAP.DEFAULT_ZOOM);
      },
      () => {
        this.locating = false;
        // Từ chối quyền → giữ center mặc định (R2.3), không báo lỗi khi silent.
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  /** Bay tới một toạ độ trên bản đồ. */
  private flyTo(lat: number, lng: number, zoom?: number): void {
    this.map?.flyTo({
      center: [lng, lat],
      zoom: zoom ?? this.map.getZoom(),
      duration: 700,
    });
  }
}
