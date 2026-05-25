import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BjGeocodingService } from './bj-geocoding.service';

export interface BjLocationData {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

const CACHE_KEY = 'bj_location_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 phút

const DEFAULT_LOCATION: BjLocationData = {
  lat: 21.0285,
  lng: 105.8542,
  accuracy: 0,
  timestamp: Date.now(),
};

@Injectable({ providedIn: 'root' })
export class BjLocationService {
  private location$ = new BehaviorSubject<BjLocationData | null>(null);
  private address$ = new BehaviorSubject<string>('Đang lấy vị trí...');
  private _hasGpsPermission$ = new BehaviorSubject<boolean>(false);

  constructor(private geoService: BjGeocodingService) {
    this._init();
  }

  getLocation(): Observable<BjLocationData | null> {
    return this.location$.asObservable();
  }

  getAddress(): Observable<string> {
    return this.address$.asObservable();
  }

  /** Observable cho biết người dùng đã cấp quyền GPS chưa */
  get hasGpsPermission$(): Observable<boolean> {
    return this._hasGpsPermission$.asObservable();
  }

  /** Giá trị hiện tại của GPS permission */
  get hasGpsPermission(): boolean {
    return this._hasGpsPermission$.value;
  }

  getCurrent(): BjLocationData | null {
    return this.location$.value ?? this._loadCache() ?? DEFAULT_LOCATION;
  }

  async refresh(): Promise<BjLocationData> {
    try {
      const pos = await this._getGPS();
      this._hasGpsPermission$.next(true);
      this._saveCache(pos);
      this.location$.next(pos);
      this._updateAddress(pos.lat, pos.lng);
      return pos;
    } catch {
      this._hasGpsPermission$.next(false);
      const current = this.getCurrent() ?? DEFAULT_LOCATION;
      this._updateAddress(current.lat, current.lng);
      return current;
    }
  }

  private async _init(): Promise<void> {
    try {
      const pos = await this._getGPS();
      this._hasGpsPermission$.next(true);
      this._saveCache(pos);
      this.location$.next(pos);
      this._updateAddress(pos.lat, pos.lng);
    } catch {
      this._hasGpsPermission$.next(false);
      const cached = this._loadCache();
      const finalLoc = cached ?? DEFAULT_LOCATION;
      this.location$.next(finalLoc);
      this._updateAddress(finalLoc.lat, finalLoc.lng);
    }
  }

  private _updateAddress(lat: number, lng: number): void {
    this.geoService.reverseGeocode(lat, lng).subscribe(addr => {
      this.address$.next(addr);
    });
  }

  private _getGPS(): Promise<BjLocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    });
  }

  private _saveCache(loc: BjLocationData): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(loc));
    } catch {}
  }

  private _loadCache(): BjLocationData | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const loc: BjLocationData = JSON.parse(raw);
      if (Date.now() - loc.timestamp < CACHE_DURATION) return loc;
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch {
      return null;
    }
  }
}
