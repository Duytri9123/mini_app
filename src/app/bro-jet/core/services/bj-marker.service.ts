import { Injectable } from '@angular/core';
import { BjStation, BjStationMarker } from '../interfaces/station.interface';
import { BjStationService } from './bj-station.service';

@Injectable({ providedIn: 'root' })
export class BjMarkerService {
  constructor(private stationService: BjStationService) {}

  /**
   * Chuyển đổi danh sách trạm thành danh sách Marker trên bản đồ.
   * Tách biệt logic xử lý Marker để giữ BjStationService tối giản.
   */
  toMarkers(stations: BjStation[], selectedStationId: string | null = null): BjStationMarker[] {
    return stations.map(s => ({
      id: s.id,
      latitude: s.latitude,
      longitude: s.longitude,
      name: s.name,
      status: s.status,
      availableBays: s.availableBays ?? 0,
      markerType: this._getMarkerType(s, selectedStationId === s.id),
    }));
  }

  private _getMarkerType(station: BjStation, isSelected: boolean): 'active' | 'inactive' | 'closed' | 'selected' {
    if (isSelected) return 'selected';
    if (station.status !== 'active') return 'inactive';
    
    const isOpen = this.stationService.isOpenNow(station);
    return isOpen ? 'active' : 'closed';
  }
}
