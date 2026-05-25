import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BjStation, BjStationMarker } from '../interfaces/station.interface';

/**
 * BJ Map Service – singleton state cho map component duy nhất
 * Quản lý trạm đang chọn, center bản đồ, danh sách markers
 */
@Injectable({ providedIn: 'root' })
export class BjMapService {
  readonly selectedStation$ = new BehaviorSubject<BjStation | null>(null);
  readonly mapCenter$ = new BehaviorSubject<{ lat: number; lng: number }>({
    lat: 21.0285,
    lng: 105.8542,
  });
  readonly stationMarkers$ = new BehaviorSubject<BjStationMarker[]>([]);

  setSelectedStation(station: BjStation | null): void {
    this.selectedStation$.next(station);
  }

  clearSelection(): void {
    this.selectedStation$.next(null);
  }

  updateCenter(lat: number, lng: number): void {
    this.mapCenter$.next({ lat, lng });
  }

  updateMarkers(markers: BjStationMarker[]): void {
    this.stationMarkers$.next(markers);
  }
}
