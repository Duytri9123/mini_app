import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { GM_API_ENDPOINTS, GM_STORAGE_KEYS } from '../constants/gm-api.constants';
import {
  GmCoordinate,
  GmCustomerAddress,
  GmCustomerAddressDetails,
  GmCustomerAddressPayload,
} from '../interfaces/location.interface';
import { GmApiService } from './gm-api.service';

interface GmCustomerAddressListResponse {
  addresses: GmCustomerAddress[];
}

interface GmCustomerAddressResponse {
  message: string;
  address: GmCustomerAddress;
}

type GmCustomerAddressDetailsStore = Record<string, GmCustomerAddressDetails>;

@Injectable({ providedIn: 'root' })
export class GmCustomerAddressService {
  private readonly endpoint = GM_API_ENDPOINTS.customerAddresses;

  constructor(private api: GmApiService) {}

  getAddresses(): Observable<GmCustomerAddress[]> {
    return this.api
      .get<GmCustomerAddressListResponse>(this.endpoint)
      .pipe(map((response) => (response.addresses ?? []).map((address) => this.hydrateAddressDetails(address))));
  }

  createAddress(payload: GmCustomerAddressPayload): Observable<GmCustomerAddress> {
    const fullPayload = this.toAddressApiPayload(payload, true);
    const basePayload = this.toAddressApiPayload(payload);

    return this.api
      .post<GmCustomerAddressResponse>(this.endpoint, fullPayload)
      .pipe(catchError((error) => (this.payloadHasDetails(payload) ? this.api.post<GmCustomerAddressResponse>(this.endpoint, basePayload) : throwError(() => error))))
      .pipe(map((response) => this.hydrateSavedAddressResponse(response.address, payload)));
  }

  updateAddress(id: number, payload: Partial<GmCustomerAddressPayload>): Observable<GmCustomerAddress> {
    const fullPayload = this.toAddressApiPayload(payload, true);
    const basePayload = this.toAddressApiPayload(payload);

    return this.api
      .patch<GmCustomerAddressResponse>(`${this.endpoint}/${id}`, fullPayload)
      .pipe(catchError((error) => (this.payloadHasDetails(payload) ? this.api.patch<GmCustomerAddressResponse>(`${this.endpoint}/${id}`, basePayload) : throwError(() => error))))
      .pipe(map((response) => this.hydrateSavedAddressResponse(response.address, payload)));
  }

  setDefault(id: number): Observable<GmCustomerAddress> {
    return this.api
      .patch<GmCustomerAddressResponse>(`${this.endpoint}/${id}/set-default`, {})
      .pipe(map((response) => response.address));
  }

  deleteAddress(id: number): Observable<void> {
    return this.api.delete<{ message: string }>(`${this.endpoint}/${id}`).pipe(
      tap(() => this.forgetAddressDetailsById(id)),
      map(() => undefined),
    );
  }

  toCoordinate(address: GmCustomerAddress): GmCoordinate {
    return {
      lat: Number(address.lat),
      lng: Number(address.lng),
      address: address.address,
    };
  }

  getAddressDetails(address: GmCustomerAddress): GmCustomerAddressDetails {
    return this.getMergedAddressDetails(address);
  }

  private hydrateSavedAddressResponse(
    address: GmCustomerAddress,
    payload: Partial<GmCustomerAddressPayload>,
  ): GmCustomerAddress {
    const hydrated = this.hydrateAddressDetails(address);
    if (!this.payloadHasDetails(payload)) {
      return hydrated;
    }

    const details = this.detailsFromPayload(payload);
    this.rememberAddressDetails(hydrated, details);
    return this.applyDetailsToAddress(hydrated, details);
  }

  private hydrateAddressDetails(address: GmCustomerAddress): GmCustomerAddress {
    return this.applyDetailsToAddress(address, this.getMergedAddressDetails(address));
  }

  private getMergedAddressDetails(address: GmCustomerAddress): GmCustomerAddressDetails {
    const stored = this.findStoredAddressDetails(address);
    const server = this.detailsFromAddress(address);

    return {
      unit: server.unit || stored?.unit || '',
      phone: server.phone || stored?.phone || '',
      contactName: server.contactName || stored?.contactName || '',
      note: server.note || stored?.note || '',
    };
  }

  private applyDetailsToAddress(address: GmCustomerAddress, details: GmCustomerAddressDetails): GmCustomerAddress {
    return {
      ...address,
      unit: details.unit || address.unit || null,
      phone: details.phone || address.phone || null,
      contact_name: details.contactName || address.contact_name || null,
      contactName: details.contactName || address.contactName || null,
      note: details.note || address.note || null,
    };
  }

  private toAddressApiPayload(payload: Partial<GmCustomerAddressPayload>, includeDetails = false): Partial<GmCustomerAddressPayload> {
    const apiPayload: Partial<GmCustomerAddressPayload> = {
      label: payload.label,
      address: payload.address,
      lat: payload.lat,
      lng: payload.lng,
      is_default: payload.is_default,
    };

    if (includeDetails) {
      apiPayload.unit = payload.unit;
      apiPayload.phone = payload.phone;
      apiPayload.contact_name = payload.contact_name ?? payload.contactName;
      apiPayload.note = payload.note;
    }

    return apiPayload;
  }

  private payloadHasDetails(payload: Partial<GmCustomerAddressPayload>): boolean {
    return 'unit' in payload || 'phone' in payload || 'contact_name' in payload || 'contactName' in payload || 'note' in payload;
  }

  private detailsFromPayload(payload: Partial<GmCustomerAddressPayload>): GmCustomerAddressDetails {
    return {
      unit: this.normalizeText(payload.unit),
      phone: this.normalizeText(payload.phone),
      contactName: this.normalizeText(payload.contactName ?? payload.contact_name),
      note: this.normalizeText(payload.note),
    };
  }

  private detailsFromAddress(address: GmCustomerAddress): GmCustomerAddressDetails {
    const record = address as unknown as Record<string, unknown>;
    return {
      unit: this.firstText(record, ['unit', 'room', 'room_number', 'floor', 'floor_room']),
      phone: this.firstText(record, ['phone', 'contact_phone', 'recipient_phone', 'receiver_phone']),
      contactName: this.firstText(record, ['contactName', 'contact_name', 'recipient_name', 'receiver_name']),
      note: this.firstText(record, ['note', 'driver_note', 'delivery_note']),
    };
  }

  private firstText(record: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }

  private normalizeText(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private rememberAddressDetails(address: GmCustomerAddress, details: GmCustomerAddressDetails): void {
    const store = this.readDetailsStore();
    this.getAddressDetailKeys(address).forEach((key) => {
      store[key] = details;
    });
    this.writeDetailsStore(store);
  }

  private findStoredAddressDetails(address: GmCustomerAddress): GmCustomerAddressDetails | null {
    const store = this.readDetailsStore();
    for (const key of this.getAddressDetailKeys(address)) {
      if (store[key]) {
        return store[key];
      }
    }
    return null;
  }

  private forgetAddressDetailsById(id: number): void {
    const store = this.readDetailsStore();
    delete store[`id:${id}`];
    this.writeDetailsStore(store);
  }

  private getAddressDetailKeys(address: GmCustomerAddress): string[] {
    const keys = [`id:${address.id}`];
    const fingerprint = this.getAddressFingerprint(address.address, Number(address.lat), Number(address.lng));
    if (fingerprint) {
      keys.push(fingerprint);
    }
    return keys;
  }

  private getAddressFingerprint(address: string | undefined, lat: number | undefined, lng: number | undefined): string {
    if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return '';
    }

    return `coord:${address.trim().toLowerCase()}|${Number(lat).toFixed(6)}|${Number(lng).toFixed(6)}`;
  }

  private readDetailsStore(): GmCustomerAddressDetailsStore {
    if (typeof localStorage === 'undefined') {
      return {};
    }

    try {
      return JSON.parse(localStorage.getItem(GM_STORAGE_KEYS.customerAddressDetails) ?? '{}') as GmCustomerAddressDetailsStore;
    } catch {
      return {};
    }
  }

  private writeDetailsStore(store: GmCustomerAddressDetailsStore): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(GM_STORAGE_KEYS.customerAddressDetails, JSON.stringify(store));
  }
}
