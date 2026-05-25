import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class BjGeocodingService {
  private readonly VIETMAP_API_KEY = environment.VIETMAP_API_KEY;

  constructor(private http: HttpClient) {}

  /**
   * Reverse Geocode: Lat/Lng -> Address string
   * Try Vietmap first, then fallback to OSM Nominatim
   */
  reverseGeocode(lat: number, lng: number): Observable<string> {
    return this._reverseVietmap(lat, lng).pipe(
      catchError(() => this._reverseOSM(lat, lng)),
      map(result => result || 'Vị trí không xác định')
    );
  }

  /**
   * Forward Geocode / Search: Query -> List of locations
   */
  searchAddress(query: string): Observable<{address: string, lat: number, lng: number}[]> {
    if (!query || query.trim().length === 0) return of([]);

    if (this.VIETMAP_API_KEY) {
      return this._searchVietmap(query).pipe(
        catchError(() => this._searchOSM(query))
      );
    }
    return this._searchOSM(query);
  }

  /**
   * Vietmap Reverse V3 API
   */
  private _reverseVietmap(lat: number, lng: number): Observable<string> {
    if (!this.VIETMAP_API_KEY) return of('');

    const url = `https://maps.vietmap.vn/api/reverse/v3?apikey=${this.VIETMAP_API_KEY}&lat=${lat}&lng=${lng}`;
    
    return this.http.get<any[]>(url).pipe(
      map(response => {
        if (Array.isArray(response) && response.length > 0) {
          // Vietmap usually returns an array of results
          return response[0].address || response[0].display_name || '';
        }
        return '';
      })
    );
  }

  /**
   * OSM Nominatim Reverse API (Fallback)
   */
  private _reverseOSM(lat: number, lng: number): Observable<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`;
    
    return this.http.get<any>(url).pipe(
      map(response => response.display_name || ''),
      catchError(() => of(''))
    );
  }

  private _searchVietmap(query: string): Observable<{address: string, lat: number, lng: number}[]> {
    const url = `https://maps.vietmap.vn/api/search/v3?apikey=${this.VIETMAP_API_KEY}&text=${encodeURIComponent(query)}`;
    return this.http.get<any[]>(url).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response.map(item => ({
            address: item.address || item.name || item.display_name || '',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lng)
          })).filter(item => item.address && !isNaN(item.lat) && !isNaN(item.lng));
        }
        return [];
      })
    );
  }

  private _searchOSM(query: string): Observable<{address: string, lat: number, lng: number}[]> {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=vn&limit=5&accept-language=vi`;
    return this.http.get<any[]>(url).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response.map(item => ({
            address: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }));
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }
}
