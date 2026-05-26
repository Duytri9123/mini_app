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
  @Input() drivers: GmDriver[] | null = [];
  @Input() compact = false;
  @Input() selectable = false;
  @Output() selectCoordinate = new EventEmitter<GmCoordinate>();

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
    if (!this.map || !this.pickup || !this.dropoff) {
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([this.pickup.lng, this.pickup.lat]);
    bounds.extend([this.dropoff.lng, this.dropoff.lat]);
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

    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
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

    if (this.pickup && this.dropoff) {
      this.fitRoute();
      return;
    }

    const singlePoint = this.pickup ?? this.dropoff;
    if (singlePoint) {
      this.map.easeTo({
        center: [singlePoint.lng, singlePoint.lat],
        zoom: this.compact ? 13 : 14,
        duration: 450,
      });
    }
  }

  private addMarker(coordinate: GmCoordinate, kind: 'pickup' | 'dropoff' | 'driver', label: string): void {
    if (!this.map) {
      return;
    }

    const element = document.createElement('div');
    element.className = `gm-map-marker gm-map-marker-${kind}`;
    element.innerHTML = `<span>${label}</span>`;

    const marker = new maplibregl.Marker({ element, anchor: 'bottom' })
      .setLngLat([coordinate.lng, coordinate.lat])
      .addTo(this.map);

    this.markers.push(marker);
  }

  private clearMarkers(): void {
    for (const marker of this.markers) {
      marker.remove();
    }
    this.markers = [];
  }
}
