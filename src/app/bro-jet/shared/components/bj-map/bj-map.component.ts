import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  AfterViewInit,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as maplibregl from 'maplibre-gl';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  createMapInstanceAsync,
  setupBaseMapEvents,
  MapBaseEventHandlers,
} from '../../../core/utils/map/map-instance.utils';
import { getStyleUrl } from '../../../core/utils/map/map-style.utils';
import {
  loadUserMarkerImageToMap,
  addSharedUserMarkerLayer,
  updateSharedUserMarkerPosition,
  registerBjStationMarkerImages,
  addBjStationMarkerSource,
  addBjStationMarkerLayers,
  setGlobalUserAvatarUrl,
} from '../../../core/utils/map/map-marker.utils';
import { BJ_MAP } from '../../../core/constants/bj-map.constants';
import { BjStationMarker } from '../../../core/interfaces/station.interface';
import { BjAuthService } from '../../../core/services/bj-auth.service';

@Component({
  selector: 'app-bj-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-map.component.html',
})
export class BjMapComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() stations: BjStationMarker[] = [];
  @Input() currentLat: number = BJ_MAP.DEFAULT_LAT;
  @Input() currentLng: number = BJ_MAP.DEFAULT_LNG;
  @Input() selectedStationId: string | null = null;
  @Input() selectedClusterId: number | null = null;
  @Input() searchLat: number | null = null;
  @Input() searchLng: number | null = null;

  @Output() stationClick = new EventEmitter<BjStationMarker>();
  @Output() clusterClick = new EventEmitter<{ stations: BjStationMarker[], clusterId: number }>();
  @Output() locationUpdated = new EventEmitter<{ lat: number; lng: number }>();
  @Output() myLocationClick = new EventEmitter<void>();
  @Output() mapReady = new EventEmitter<void>();

  readonly containerId = BJ_MAP.MAP_CONTAINER_ID;

  private _map: maplibregl.Map | null = null;
  private _mapReady = false;
  private _isSatellite = false;
  private _baseEventHandlers: MapBaseEventHandlers | null = null;
  private _destroy$ = new Subject<void>();
  private _searchMarker: maplibregl.Marker | null = null;

  constructor(private authService: BjAuthService, private ngZone: NgZone) {}

  ngOnInit(): void {
    // Sync user avatar URL so the map marker shows the correct avatar
    this.authService.currentUser$
      .pipe(takeUntil(this._destroy$))
      .subscribe(user => {
        const url = user?.avatarUrl ?? '';
        if (url) setGlobalUserAvatarUrl(url, true);
      });
  }

  ngAfterViewInit(): void {
    this._initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this._mapReady) return;
    if (changes['stations'] || changes['selectedStationId']) {
      this._updateStationMarkers();
    }
    if (changes['selectedClusterId']) {
      this._updateClusterSelection(changes['selectedClusterId'].previousValue);
    }
    if (changes['currentLat'] || changes['currentLng']) {
      this._updateUserMarker();
    }
    if (changes['searchLat'] || changes['searchLng']) {
      this._updateSearchMarker();
    }
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
    if (this._map && this._baseEventHandlers) {
      const h = this._baseEventHandlers;
      this._map.off('moveend', h.moveEndHandler);
      this._map.off('error', h.errorHandler);
      this._map.off('webglcontextlost', h.contextLostHandler);
      this._map.off('webglcontextrestored', h.contextRestoredHandler);
    }
    this._map?.remove();
    this._map = null;
  }

  private _updateClusterSelection(prevId?: number): void {
    if (!this._map) return;
    if (prevId !== undefined && prevId !== null) {
      this._map.setFeatureState(
        { source: BJ_MAP.STATION_SOURCE_ID, id: prevId },
        { selected: false }
      );
    }
    if (this.selectedClusterId !== null) {
      this._map.setFeatureState(
        { source: BJ_MAP.STATION_SOURCE_ID, id: this.selectedClusterId },
        { selected: true }
      );
    }
  }

  flyToStation(id: string): void {
    const station = this.stations.find((s) => s.id === id);
    if (!station || !this._map) return;
    this._map.flyTo({ center: [station.longitude, station.latitude], zoom: 15, duration: 800 });
  }

  flyToUserLocation(lat?: number, lng?: number): void {
    if (!this._map) return;
    const targetLat = lat ?? this.currentLat;
    const targetLng = lng ?? this.currentLng;
    this._map.flyTo({ center: [targetLng, targetLat], zoom: BJ_MAP.DEFAULT_ZOOM, duration: 800 });
  }

  onMyLocationButtonClick(): void {
    this.myLocationClick.emit();
    this.flyToUserLocation();
  }

  switchMapLayer(): void {
    if (!this._map) return;
    this._isSatellite = !this._isSatellite;
    const styleUrl = this._isSatellite ? getStyleUrl('satellite-v1') : getStyleUrl('day-v1');
    this._map.setStyle(styleUrl);
    this._map.once('styledata', () => {
      registerBjStationMarkerImages(this._map!);
      this._setupStationSource();
      this._updateStationMarkers();
      this._setupUserMarker();
    });
  }

  private async _initMap(): Promise<void> {
    try {
      this._map = await createMapInstanceAsync(
        this.containerId,
        getStyleUrl('day-v1'),
        [this.currentLng, this.currentLat],
        BJ_MAP.DEFAULT_ZOOM
      );

      this._baseEventHandlers = setupBaseMapEvents(
        this._map,
        () => {
          if (!this._map) return;
          const center = this._map.getCenter();
          this.locationUpdated.emit({ lat: center.lat, lng: center.lng });
        },
        () => {
          registerBjStationMarkerImages(this._map!);
          this._setupStationSource();
          this._updateStationMarkers();
          this._setupUserMarker();
        }
      );

      this._map.once('load', async () => {
        registerBjStationMarkerImages(this._map!);
        await this._setupUserMarker();
        this._setupStationSource();
        this._updateStationMarkers();
        this._setupStationClickEvents();
        this._updateSearchMarker();
        this._mapReady = true;
        this.mapReady.emit();
      });
    } catch (err) {
      console.error('[BjMapComponent] Failed to init map', err);
    }
  }

  private async _setupUserMarker(): Promise<void> {
    if (!this._map) return;
    await loadUserMarkerImageToMap(this._map);
    addSharedUserMarkerLayer(this._map, BJ_MAP.USER_SOURCE_ID, BJ_MAP.USER_LAYER_ID);
    updateSharedUserMarkerPosition(this._map, this.currentLat, this.currentLng, BJ_MAP.USER_SOURCE_ID);
  }

  private _updateUserMarker(): void {
    if (!this._map) return;
    updateSharedUserMarkerPosition(this._map, this.currentLat, this.currentLng, BJ_MAP.USER_SOURCE_ID);
  }

  private _updateSearchMarker(): void {
    if (!this._map) return;
    
    if (this.searchLat === null || this.searchLng === null) {
      if (this._searchMarker) {
        this._searchMarker.remove();
        this._searchMarker = null;
      }
      return;
    }

    if (!this._searchMarker) {
      const el = document.createElement('div');
      el.innerHTML = `<div class="w-16 h-16 text-primary drop-shadow-2xl" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`;
      
      this._searchMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([this.searchLng, this.searchLat])
        .addTo(this._map);
    } else {
      this._searchMarker.setLngLat([this.searchLng, this.searchLat]);
    }
  }

  private _setupStationSource(): void {
    if (!this._map) return;
    const map = this._map;

    if (map.getLayer(BJ_MAP.STATION_SINGLE_LAYER)) map.removeLayer(BJ_MAP.STATION_SINGLE_LAYER);
    if (map.getLayer(BJ_MAP.STATION_CLUSTER_COUNT)) map.removeLayer(BJ_MAP.STATION_CLUSTER_COUNT);
    if (map.getLayer(BJ_MAP.STATION_CLUSTER_LAYER)) map.removeLayer(BJ_MAP.STATION_CLUSTER_LAYER);
    if (map.getSource(BJ_MAP.STATION_SOURCE_ID)) map.removeSource(BJ_MAP.STATION_SOURCE_ID);

    const layerIds = {
      source: BJ_MAP.STATION_SOURCE_ID,
      cluster: BJ_MAP.STATION_CLUSTER_LAYER,
      clusterCount: BJ_MAP.STATION_CLUSTER_COUNT,
      single: BJ_MAP.STATION_SINGLE_LAYER,
    };

    addBjStationMarkerSource(map, BJ_MAP.STATION_SOURCE_ID, this._buildStationGeoJSON());
    addBjStationMarkerLayers(map, layerIds);
  }

  private _updateStationMarkers(): void {
    if (!this._map) return;
    const source = this._map.getSource(BJ_MAP.STATION_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) { this._setupStationSource(); return; }
    source.setData(this._buildStationGeoJSON());
  }

  private _buildStationGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: this.stations.map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
        properties: {
          id: s.id,
          name: s.name,
          availableBays: s.availableBays,
          markerType: s.markerType,
          selected: s.id === this.selectedStationId,
        },
      })),
    };
  }

  private _setupStationClickEvents(): void {
    if (!this._map) return;

    // Single click
    this._map.on('click', BJ_MAP.STATION_SINGLE_LAYER, (e) => {
      const features = e.features;
      if (!features?.length) return;
      const id = features[0].properties?.['id'];
      const station = this.stations.find((s) => s.id === id);
      if (station) {
        this.ngZone.run(() => {
          this.stationClick.emit(station);
        });
      }
    });

    // Cluster click
    this._map.on('click', BJ_MAP.STATION_CLUSTER_LAYER, async (e) => {
      const features = e.features as any;
      if (!features?.length || !this._map) return;

      const clusterId = features[0].properties['cluster_id'];
      const source = this._map.getSource(BJ_MAP.STATION_SOURCE_ID) as any;

      // We no longer zoom in automatically based on user requirement
      
      // Set feature state to highlight the cluster
      if (this.selectedClusterId !== null) {
        this._map.setFeatureState(
          { source: BJ_MAP.STATION_SOURCE_ID, id: this.selectedClusterId },
          { selected: false }
        );
      }
      this.selectedClusterId = features[0].id as number;
      this._map.setFeatureState(
        { source: BJ_MAP.STATION_SOURCE_ID, id: this.selectedClusterId },
        { selected: true }
      );

      // 2. Get leaf nodes and emit
      try {
        const leaves = await source.getClusterLeaves(clusterId, 100, 0);
        if (!leaves) return;
        const stationIds = leaves.map((leaf: any) => leaf.properties.id);
        const clusterStations = this.stations.filter(s => stationIds.includes(s.id));
        this.ngZone.run(() => {
          this.clusterClick.emit({ stations: clusterStations, clusterId: this.selectedClusterId as number });
        });
      } catch (e) {
        console.warn('Cannot get cluster leaves', e);
      }
    });

    // Cursor polish
    const layers = [BJ_MAP.STATION_SINGLE_LAYER, BJ_MAP.STATION_CLUSTER_LAYER];
    layers.forEach(lyr => {
      this._map!.on('mouseenter', lyr, () => {
        if (this._map) this._map.getCanvas().style.cursor = 'pointer';
      });
      this._map!.on('mouseleave', lyr, () => {
        if (this._map) this._map.getCanvas().style.cursor = '';
      });
    });
  }
}
