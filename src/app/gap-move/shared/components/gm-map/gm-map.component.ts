import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as maplibregl from 'maplibre-gl';
import { environment } from 'src/environments/environment';
import { GM_DEFAULT_CENTER, GM_MAP_DEFAULT_ZOOM } from '../../../core/constants/gm-map.constants';
import { GmDriver } from '../../../core/interfaces/driver.interface';
import { GmCoordinate } from '../../../core/interfaces/location.interface';

export interface GmMapMarkerDragEvent {
  kind: 'pickup' | 'dropoff' | 'stop';
  index?: number;
  coordinate: GmCoordinate;
}

type GmMapMarkerKind = 'pickup' | 'dropoff' | 'stop' | 'driver';

@Component({
  selector: 'app-gm-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gm-map.component.html',
  styleUrls: ['./gm-map.component.scss'],
})
export class GmMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() pickup?: GmCoordinate | null;
  @Input() dropoff?: GmCoordinate | null;
  @Input() stops: GmCoordinate[] | null = [];
  @Input() stopIndexes: number[] | null = [];
  @Input() drivers: GmDriver[] | null = [];
  @Input() compact = false;
  @Input() selectable = false;
  @Input() draggable = false;
  @Output() selectCoordinate = new EventEmitter<GmCoordinate>();
  @Output() markerDragEnd = new EventEmitter<GmMapMarkerDragEvent>();

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private map?: maplibregl.Map;
  private markers: maplibregl.Marker[] = [];

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.renderMarkers();
  }

  ngOnDestroy(): void {
    this.clearMarkers();
    this.map?.remove();
  }

  fitRoute(): void {
    if (!this.map) {
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    let pointCount = 0;

    if (this.pickup) {
      bounds.extend([this.pickup.lng, this.pickup.lat]);
      pointCount += 1;
    }
    for (const stop of this.stops ?? []) {
      bounds.extend([stop.lng, stop.lat]);
      pointCount += 1;
    }
    if (this.dropoff) {
      bounds.extend([this.dropoff.lng, this.dropoff.lat]);
      pointCount += 1;
    }

    if (pointCount < 2) {
      return;
    }

    this.map.fitBounds(bounds, { padding: 90, maxZoom: 14, duration: 600 });
  }

  private initMap(): void {
    const center = this.pickup ?? GM_DEFAULT_CENTER;
    this.map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: this.getStyleUrl(),
      center: [center.lng, center.lat],
      zoom: this.compact ? 12 : GM_MAP_DEFAULT_ZOOM,
      attributionControl: false,
    });

    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    this.map.on('click', this.handleMapClick);
    this.map.once('load', () => {
      this.renderMarkers();
      this.fitRoute();
    });
  }

  private getStyleUrl(): string {
    return `https://maptiles.openmap.vn/styles/day-v1/style.json?apikey=${environment.VIETMAP_API_KEY}`;
  }

  private renderMarkers(): void {
    if (!this.map) {
      return;
    }

    this.clearMarkers();

    if (this.pickup) {
      this.addMarker(this.pickup, 'pickup', 'Đón');
    }
    for (const [index, stop] of (this.stops ?? []).entries()) {
      const originalIndex = this.stopIndexes?.[index] ?? index;
      this.addMarker(stop, 'stop', `${originalIndex + 1}`, originalIndex);
    }
    if (this.dropoff) {
      this.addMarker(this.dropoff, 'dropoff', 'Giao');
    }
    for (const driver of this.drivers ?? []) {
      if (driver.currentLocation) {
        this.addMarker(driver.currentLocation, 'driver', driver.vehicle.vehicleType);
      }
    }

    this.focusVisibleRoute();
  }

  private handleMapClick = (event: maplibregl.MapMouseEvent): void => {
    if (!this.selectable) {
      return;
    }

    this.selectCoordinate.emit({
      lat: event.lngLat.lat,
      lng: event.lngLat.lng,
      address: 'Vị trí đã chọn trên bản đồ',
    });
  };

  private focusVisibleRoute(): void {
    if (!this.map) {
      return;
    }

    const routePoints = [this.pickup, ...(this.stops ?? []), this.dropoff].filter((point): point is GmCoordinate => Boolean(point));
    if (routePoints.length > 1) {
      this.fitRoute();
      return;
    }

    const singlePoint = routePoints[0];
    if (singlePoint) {
      this.map.easeTo({
        center: [singlePoint.lng, singlePoint.lat],
        zoom: this.compact ? 13 : 14,
        duration: 450,
      });
    }
  }

  private addMarker(coordinate: GmCoordinate, kind: GmMapMarkerKind, label: string, index?: number): void {
    if (!this.map) {
      return;
    }

    const element = document.createElement('div');
    element.className = `gm-map-marker gm-map-marker-${kind}`;
    element.innerHTML = `<span>${label}</span>`;

    const marker = new maplibregl.Marker({
      element,
      anchor: 'bottom',
      draggable: this.draggable && kind !== 'driver',
    })
      .setLngLat([coordinate.lng, coordinate.lat])
      .addTo(this.map);

    if (this.draggable && kind !== 'driver') {
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        this.markerDragEnd.emit({
          kind,
          index,
          coordinate: {
            lat: lngLat.lat,
            lng: lngLat.lng,
            address: coordinate.address || 'Vị trí đã chọn trên bản đồ',
          },
        });
      });
    }

    this.markers.push(marker);
  }

  private clearMarkers(): void {
    for (const marker of this.markers) {
      marker.remove();
    }
    this.markers = [];
  }
}
