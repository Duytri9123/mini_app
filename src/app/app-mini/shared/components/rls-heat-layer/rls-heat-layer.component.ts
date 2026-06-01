import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';

import { RlsHeatPoint } from '../../../core/interfaces';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — `RlsHeatLayerComponent`.
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone component QUẢN LÝ heatmap layer của **MapLibre GL** (design.md
 * §6.3, §9.3) — không render DOM riêng (template rỗng). Nhận `@Input heatPoints`
 * (mỗi ô geohash đã decay: `score` chuẩn hoá (0,1], `category` trội — design.md
 * §4.3/§4.4) và một `@Input map` (instance MapLibre do page sở hữu), rồi tạo /
 * cập nhật một GeoJSON source + heatmap layer GPU-accelerated để vẽ vùng "hot".
 *
 * Vì sao tách khỏi `RlsMapMarkerComponent`: marker là DOM tuỳ biến (glow/pulse),
 * còn heat là layer GPU mật độ điểm lớn — tách giúp mỗi component một trách
 * nhiệm (design.md §2.2 khuyến nghị MapLibre cho heat).
 *
 * Vòng đời:
 *   - Khi đã có `map` (và style đã load) → tạo source + layer một lần.
 *   - `heatPoints` đổi → `setData` (không add lại layer) để cập nhật mượt (R4.4).
 *   - `ngOnDestroy` → gỡ layer + source, tránh rò khi điều hướng.
 *
 * Trọng số heat lấy từ `score` đã chuẩn hoá (0,1]; màu theo ramp mật độ
 * (xanh → vàng → đỏ) phản ánh độ "hot" (design.md §4.3). Component an toàn khi
 * `map` chưa sẵn sàng (no-op) để page có thể bind sớm.
 *
 * _Requirements: 4.4, 14.5_
 * _Design: §6.3 / §4.4 heatmap layer; §9.3 RlsHeatLayerComponent_
 */
@Component({
  selector: 'rls-heat-layer',
  standalone: true,
  imports: [],
  template: '',
})
export class RlsHeatLayerComponent implements OnChanges, OnDestroy {
  /** Instance MapLibre do page sở hữu — `null` cho tới khi map khởi tạo xong. */
  @Input() map: MapLibreMap | null = null;

  /** Điểm heat (mỗi ô geohash) đã decay — nguồn dữ liệu cho layer (design.md §4.4). */
  @Input() heatPoints: RlsHeatPoint[] = [];

  /** Id source/layer (cho phép nhiều heat layer cùng map nếu cần). */
  @Input() sourceId = 'rls-heat-source';
  @Input() layerId = 'rls-heat-layer';

  /** Đã add source/layer vào map hay chưa (chống add trùng). */
  private _layerAdded = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) {
      return;
    }
    // Map vừa được gán → đảm bảo layer tồn tại (chờ style nếu cần) rồi nạp data.
    if (changes['map']) {
      this._ensureLayer();
    }
    if (this._layerAdded) {
      this._updateData();
    }
  }

  ngOnDestroy(): void {
    this._removeLayer();
  }

  /**
   * Tạo source + heatmap layer nếu chưa có. Nếu style chưa load xong thì hoãn
   * tới sự kiện `load` (MapLibre không cho add layer trước khi style sẵn sàng).
   */
  private _ensureLayer(): void {
    const map = this.map;
    if (!map || this._layerAdded) {
      return;
    }
    if (!map.isStyleLoaded()) {
      map.once('load', () => this._addLayer());
      return;
    }
    this._addLayer();
  }

  /** Thêm GeoJSON source + heatmap layer với data hiện tại. */
  private _addLayer(): void {
    const map = this.map;
    if (!map || this._layerAdded) {
      return;
    }
    if (map.getSource(this.sourceId)) {
      // Source tồn tại từ trước (vd hot-reload) → coi như đã add.
      this._layerAdded = true;
      this._updateData();
      return;
    }

    map.addSource(this.sourceId, {
      type: 'geojson',
      data: this._buildGeoJSON(),
    });

    map.addLayer({
      id: this.layerId,
      type: 'heatmap',
      source: this.sourceId,
      paint: {
        // Trọng số mỗi điểm = score chuẩn hoá (0,1] (design.md §4.4).
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'score'],
          0,
          0,
          1,
          1,
        ],
        // Cường độ tăng theo zoom (zoom sâu → vùng hot rõ hơn).
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          1,
          15,
          3,
        ],
        // Ramp màu theo mật độ: trong suốt → lam → lục → vàng → đỏ (design.md §4.3).
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(15,23,42,0)',
          0.2,
          'rgba(34,211,238,0.55)',
          0.45,
          'rgba(52,211,153,0.65)',
          0.7,
          'rgba(251,191,36,0.8)',
          1,
          'rgba(244,63,94,0.9)',
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          12,
          15,
          28,
        ],
        'heatmap-opacity': 0.85,
      },
    });

    this._layerAdded = true;
  }

  /** Cập nhật dữ liệu source (gọi khi `heatPoints` đổi). */
  private _updateData(): void {
    const map = this.map;
    if (!map) {
      return;
    }
    const source = map.getSource(this.sourceId) as GeoJSONSource | undefined;
    if (source) {
      source.setData(this._buildGeoJSON());
    }
  }

  /** Gỡ layer + source khỏi map (cleanup). */
  private _removeLayer(): void {
    const map = this.map;
    if (!map) {
      this._layerAdded = false;
      return;
    }
    if (map.getLayer(this.layerId)) {
      map.removeLayer(this.layerId);
    }
    if (map.getSource(this.sourceId)) {
      map.removeSource(this.sourceId);
    }
    this._layerAdded = false;
  }

  /**
   * Dựng `FeatureCollection` từ `heatPoints`. Mỗi feature mang `score` (kẹp về
   * (0,1] cho trọng số ổn định) + `category` để dùng về sau (vd layer phụ theo
   * loại). Điểm có toạ độ/score không hợp lệ bị loại để layer không vỡ.
   */
  private _buildGeoJSON(): GeoJSON.FeatureCollection<GeoJSON.Point> {
    const points = Array.isArray(this.heatPoints) ? this.heatPoints : [];
    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];

    for (const p of points) {
      if (
        !p ||
        !Number.isFinite(p.lat) ||
        !Number.isFinite(p.lng) ||
        !Number.isFinite(p.score)
      ) {
        continue;
      }
      const score = Math.min(Math.max(p.score, 0), 1);
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: {
          geohash: p.geohash,
          score,
          category: p.category ?? null,
        },
      });
    }

    return { type: 'FeatureCollection', features };
  }
}
