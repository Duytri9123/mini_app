import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { BjApiService } from './bj-api.service';
import { BjStation, BjStationMarker, BjStationListResponse, BjStationResponse, BjStationListItem, BjOpeningHour, BjServicePackage } from '../interfaces/station.interface';
import { API_URL } from 'src/environments/environment';

export interface BjAvailabilityResponse {
  slots: BjTimeSlot[];
  availableBays: number;
  servicePackages: BjServicePackage[];
  service_packages: BjServicePackage[];
  selectedPackage: BjServicePackage;
  selected_package: BjServicePackage;
}

export interface BjTimeSlot {
  time: string;
  available: boolean;
  bayId?: string;
}

@Injectable({ providedIn: 'root' })
export class BjStationService {
  stations$ = new BehaviorSubject<BjStation[]>([]);

  constructor(private api: BjApiService, private http: HttpClient) {}

  /** Lấy danh sách trạm từ API /api/stations */
  getStations(lat: number, lng: number, _radius: number = 10, forceRefresh = false): Observable<BjStation[]> {
    if (!forceRefresh && this.stations$.value.length > 0) {
      return of(this.stations$.value);
    }

    return this.http
      .get<BjStationListResponse>(`${API_URL}/stations`)
      .pipe(
        map(res => (res.data || []).map(item => {
          const station = this._mapListItemToStation(item);
          if (lat !== 0 && lng !== 0) {
            station.distance = this.getDistance(lat, lng, station.latitude, station.longitude);
          }
          return station;
        })),
        map(stations => stations.sort((a, b) => (a.distance || 0) - (b.distance || 0))),
        tap(stations => this.stations$.next(stations)),
        catchError(err => {
          console.error('Error fetching stations:', err);
          return of([]);
        })
      );
  }

  /** Lấy chi tiết trạm sạc từ /api/stations/{id} */
  getStationById(id: string): Observable<BjStation> {
    return this.http
      .get<BjStationResponse>(`${API_URL}/stations/${id}`)
      .pipe(
        map(res => this._enrichStation(res.data)),
        catchError(err => {
          console.error(`Error fetching station ${id}:`, err);
          throw err;
        })
      );
  }

  /** Alias for getStationById to maintain compatibility if used elsewhere */
  getStationDetail(id: string): Observable<BjStation> {
    return this.getStationById(id);
  }

  getAvailability(stationId: string, date: string, packageId?: string): Observable<BjAvailabilityResponse> {
    let url = `stations/${stationId}/availability?date=${date}`;
    if (packageId) url += `&package_id=${packageId}`;
    return this.api.get(url) as Observable<BjAvailabilityResponse>;
  }

  searchStations(query: string): Observable<BjStation[]> {
    // If backend supports search, use it. Otherwise filter locally.
    return this.getStations(0, 0).pipe(
      map(stations => stations.filter(s => 
        s.name.toLowerCase().includes(query.toLowerCase()) || 
        s.address.toLowerCase().includes(query.toLowerCase())
      ))
    );
  }


  /** Helper to get primary image URL */
  getPrimaryImageUrl(station: BjStation | BjStationListItem): string {
    if (station.url_image) return station.url_image;
    if (station.images && station.images.length > 0) {
      const primary = station.images.find(img => img.is_primary) || station.images[0];
      return primary.url;
    }
    return 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&q=80&w=800'; // High quality car wash placeholder
  }

  /** Logic checking if station is open now based on API time strings or opening_hours array */
  isOpenNow(station: BjStation): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Try today_work_start_time and today_non_work_start_time (new API format)
    if (station.today_work_start_time && station.today_non_work_start_time) {
      const openMinutes = this._timeStringToMinutes(station.today_work_start_time);
      const closeMinutes = this._timeStringToMinutes(station.today_non_work_start_time);
      
      if (openMinutes !== null && closeMinutes !== null) {
        return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
      }
    }

    // 2. Fallback to is_open_now boolean flag from API
    if (station.is_open_now !== undefined) return station.is_open_now;

    // 3. Fallback to opening_hours array calculation
    if (!station.opening_hours || station.opening_hours.length === 0) return true;
    
    let dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
    const apiDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    const todaySchedule = station.opening_hours.find(h => h.day_of_week === apiDay);
    if (!todaySchedule) return false;

    const openMinutes = this._timeStringToMinutes(todaySchedule.open_time);
    const closeMinutes = this._timeStringToMinutes(todaySchedule.close_time);
    
    if (openMinutes !== null && closeMinutes !== null) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }

    return true;
  }

  getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this._deg2rad(lat2 - lat1);
    const dLon = this._deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._deg2rad(lat1)) * Math.cos(this._deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  private _deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private _timeStringToMinutes(timeStr: string | null | undefined): number | null {
    if (!timeStr) return null;
    try {
      const [h, m] = timeStr.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    } catch (e) {
      return null;
    }
  }


  private _mapListItemToStation(item: BjStationListItem): BjStation {
    let isSelfService = item.is_self_service;
    let hasEvCharging = item.has_ev_charging;
    
    if (item.service && Array.isArray(item.service)) {
      if (isSelfService === undefined) {
         isSelfService = item.service.some(s => s.id === 'self_service' && s.enabled);
      }
      if (hasEvCharging === undefined) {
         hasEvCharging = item.service.some(s => s.id === 'ev_charging' && s.enabled);
      }
      
      // Filter out disabled services so they don't show as badges on UI
      item.service = item.service.filter(s => s.enabled);
    }

    // Merge new JSON fields into the mapping
    const station = {
      id: item.id,
      name: item.name || 'Trạm rửa xe BroJet',
      address: item.address || 'Địa chỉ đang được cập nhật...',
      latitude: item.latitude || 0,
      longitude: item.longitude || 0,
      status: item.status || 'active',
      images: item.images || [],
      is_self_service: isSelfService,
      has_ev_charging: hasEvCharging,
      availableBays: item.availableBays,
      rating: item.rating,
      reviewCount: item.reviewCount,
      distance: item.distance,
      is_open_now: item.is_open_now,
      today_work_start_time: item.today_work_start_time,
      today_non_work_start_time: item.today_non_work_start_time,
      url_image: item.url_image,
      service_packages: item.service_packages,
      service: item.service,
    } as BjStation;

    return this._enrichStation(station);
  }

  private _enrichStation(station: BjStation): BjStation {
    if (station.service && Array.isArray(station.service)) {
      if (station.is_self_service === undefined) {
         station.is_self_service = station.service.some(s => s.id === 'self_service' && s.enabled);
      }
      if (station.has_ev_charging === undefined) {
         station.has_ev_charging = station.service.some(s => s.id === 'ev_charging' && s.enabled);
      }
      // Filter out disabled services
      station.service = station.service.filter(s => s.enabled);
    }

    // Map opening_hours to openTime/closeTime for legacy component support
    if (station.today_work_start_time && station.today_non_work_start_time) {
      station.openTime = station.today_work_start_time.substring(0, 5);
      station.closeTime = station.today_non_work_start_time.substring(0, 5);
    } else if (station.opening_hours && station.opening_hours.length > 0) {
      const today = new Date().getDay();
      const apiDay = today === 0 ? 7 : today;
      const todaySchedule = station.opening_hours.find(h => h.day_of_week === apiDay) || station.opening_hours[0];
      
      station.openTime = todaySchedule.open_time.substring(0, 5); // HH:mm
      station.closeTime = todaySchedule.close_time.substring(0, 5); // HH:mm
    } else {
      station.openTime = station.openTime || '00:00';
      station.closeTime = station.closeTime || '23:59';
    }
    return station;
  }
}
