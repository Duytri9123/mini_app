import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { GmCoordinate } from '../interfaces/location.interface';

export interface GmAddressSearchResult {
  address: string;
  coordinate: GmCoordinate;
}

type UnknownRecord = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class GmGeocodingService {
  private readonly vietmapApiKey = environment.VIETMAP_API_KEY;

  constructor(private http: HttpClient) {}

  searchAddress(query: string): Observable<GmAddressSearchResult[]> {
    const text = query.trim();
    if (!text) {
      return of([]);
    }

    if (!this.vietmapApiKey) {
      return this.searchOpenStreetMap(text);
    }

    const url = `https://maps.vietmap.vn/api/search/v3?apikey=${this.vietmapApiKey}&text=${encodeURIComponent(text)}`;
    return this.http.get<unknown>(url).pipe(
      map((response) =>
        this.getResultItems(response)
          .map((item) => this.toSearchResult(item))
          .filter((item): item is GmAddressSearchResult => Boolean(item)),
      ),
      switchMap((results) => (results.length ? of(results) : this.searchOpenStreetMap(text))),
      catchError(() => this.searchOpenStreetMap(text)),
    );
  }

  reverseGeocode(lat: number, lng: number): Observable<GmAddressSearchResult | null> {
    if (!this.vietmapApiKey) {
      return this.reverseOpenStreetMap(lat, lng);
    }

    const url = `https://maps.vietmap.vn/api/reverse/v3?apikey=${this.vietmapApiKey}&lat=${lat}&lng=${lng}`;
    return this.http.get<unknown>(url).pipe(
      map((response) => {
        const item = this.pickFirstResult(response);
        const address = item ? this.extractAddress(item) : '';
        if (!address) {
          return null;
        }

        return {
          address,
          coordinate: {
            lat,
            lng,
            address,
          },
        };
      }),
      switchMap((result) => (result ? of(result) : this.reverseOpenStreetMap(lat, lng))),
      catchError(() => this.reverseOpenStreetMap(lat, lng)),
    );
  }

  private reverseOpenStreetMap(lat: number, lng: number): Observable<GmAddressSearchResult | null> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`;
    return this.http.get<unknown>(url).pipe(
      map((response) => {
        const item = this.asRecord(response);
        const address = item ? this.extractAddress(item) : '';
        if (!address) {
          return null;
        }

        return {
          address,
          coordinate: { lat, lng, address },
        };
      }),
      catchError(() => of(null)),
    );
  }

  private searchOpenStreetMap(query: string): Observable<GmAddressSearchResult[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=vn&limit=5&accept-language=vi&q=${encodeURIComponent(query)}`;
    return this.http.get<unknown>(url).pipe(
      map((response) =>
        this.getResultItems(response)
          .map((item) => this.toSearchResult(item))
          .filter((item): item is GmAddressSearchResult => Boolean(item)),
      ),
      catchError(() => of([])),
    );
  }

  private toSearchResult(item: UnknownRecord): GmAddressSearchResult | null {
    const address = this.extractAddress(item);
    const coordinate = this.extractCoordinate(item);
    if (!address || !coordinate) {
      return null;
    }

    return {
      address,
      coordinate: {
        ...coordinate,
        address,
      },
    };
  }

  private pickFirstResult(response: unknown): UnknownRecord | null {
    return this.getResultItems(response)[0] ?? null;
  }

  private getResultItems(response: unknown): UnknownRecord[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is UnknownRecord => this.isRecord(item));
    }

    if (!this.isRecord(response)) {
      return [];
    }

    const collectionKeys = ['data', 'items', 'results', 'result', 'features', 'rows'];
    for (const key of collectionKeys) {
      const value = response[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is UnknownRecord => this.isRecord(item));
      }
      if (this.isRecord(value)) {
        const nestedItems = this.getResultItems(value);
        return nestedItems.length ? nestedItems : [value];
      }
    }

    return [response];
  }

  private extractAddress(item: UnknownRecord): string {
    const properties = this.asRecord(item['properties']);
    const compound = this.asRecord(item['compound']);

    const detailedAddress =
      this.pickString(item, ['address', 'formatted_address', 'display_name', 'display', 'full_address', 'description']) ||
      this.pickString(properties, ['address', 'formatted_address', 'display_name', 'display', 'full_address', 'description']) ||
      this.buildAddressFromParts(item) ||
      this.buildAddressFromParts(properties) ||
      this.pickString(compound, ['name', 'address', 'full_address']) ||
      this.buildAddressFromParts(this.asRecord(item['address']));

    return detailedAddress || this.pickString(item, ['name', 'label']) || this.pickString(properties, ['name', 'label']);
  }

  private buildAddressFromParts(item: UnknownRecord | null): string {
    if (!item) {
      return '';
    }

    const houseNumber = this.pickString(item, ['house_number', 'housenumber', 'hs_num', 'number']);
    const street = this.pickString(item, ['street', 'road', 'street_name', 'route']);
    const ward = this.pickString(item, ['ward', 'commune', 'subdistrict', 'quarter', 'suburb', 'neighbourhood']);
    const district = this.pickString(item, ['district', 'county', 'city_district']);
    const city = this.pickString(item, ['city', 'province', 'state']);
    const streetLine = [houseNumber, street].filter(Boolean).join(' ');

    return [streetLine, ward, district, city].filter(Boolean).join(', ');
  }

  private extractCoordinate(item: UnknownRecord): Pick<GmCoordinate, 'lat' | 'lng'> | null {
    const directCoordinate = this.extractCoordinateFromRecord(item);
    if (directCoordinate) {
      return directCoordinate;
    }

    const location = this.asRecord(item['location']) || this.asRecord(item['position']) || this.asRecord(item['coordinate']);
    const nestedCoordinate = this.extractCoordinateFromRecord(location);
    if (nestedCoordinate) {
      return nestedCoordinate;
    }

    const geometry = this.asRecord(item['geometry']);
    const geometryCoordinate = this.extractCoordinateFromGeometry(geometry);
    if (geometryCoordinate) {
      return geometryCoordinate;
    }

    return this.extractCoordinateFromArray(item['coordinates']);
  }

  private extractCoordinateFromRecord(item: UnknownRecord | null): Pick<GmCoordinate, 'lat' | 'lng'> | null {
    if (!item) {
      return null;
    }

    const lat = this.toNumber(item['lat'] ?? item['latitude'] ?? item['y']);
    const lng = this.toNumber(item['lng'] ?? item['lon'] ?? item['long'] ?? item['longitude'] ?? item['x']);

    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }

  private extractCoordinateFromGeometry(geometry: UnknownRecord | null): Pick<GmCoordinate, 'lat' | 'lng'> | null {
    if (!geometry) {
      return null;
    }

    return this.extractCoordinateFromArray(geometry['coordinates']);
  }

  private extractCoordinateFromArray(value: unknown): Pick<GmCoordinate, 'lat' | 'lng'> | null {
    if (!Array.isArray(value) || value.length < 2) {
      return null;
    }

    const lng = this.toNumber(value[0]);
    const lat = this.toNumber(value[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }

  private pickString(item: UnknownRecord | null, keys: string[]): string {
    if (!item) {
      return '';
    }

    for (const key of keys) {
      const value = item[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      return Number(value);
    }
    return Number.NaN;
  }

  private asRecord(value: unknown): UnknownRecord | null {
    return this.isRecord(value) ? value : null;
  }

  private isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
