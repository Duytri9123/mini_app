import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GmCoordinate } from '../interfaces/location.interface';
import { GmGeocodingService } from './gm-geocoding.service';

@Injectable({ providedIn: 'root' })
export class GmLocationService {
  private readonly current$ = new BehaviorSubject<GmCoordinate>({ lat: 0, lng: 0, address: 'Chưa xác định vị trí' });
  readonly address$ = new BehaviorSubject<string>('Chưa xác định vị trí');

  hasGpsPermission = false;

  constructor(private geocodingService: GmGeocodingService) {}

  getCurrent(): GmCoordinate {
    return this.current$.getValue();
  }

  getAddress() {
    return this.address$.asObservable();
  }

  refresh(): Promise<GmCoordinate> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        this.hasGpsPermission = false;
        const fallback = { lat: 0, lng: 0, address: 'Chưa xác định vị trí' };
        this.current$.next(fallback);
        this.address$.next(fallback.address);
        resolve(fallback);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.hasGpsPermission = true;

          this.geocodingService.reverseGeocode(lat, lng).subscribe((result) => {
            const address = result?.address || 'Vị trí hiện tại';
            const coordinate: GmCoordinate = { lat, lng, address };
            this.current$.next(coordinate);
            this.address$.next(address);
            resolve(coordinate);
          });
        },
        () => {
          this.hasGpsPermission = false;
          const fallback = { lat: 0, lng: 0, address: 'Chưa xác định vị trí' };
          this.current$.next(fallback);
          this.address$.next(fallback.address);
          resolve(fallback);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }
}
