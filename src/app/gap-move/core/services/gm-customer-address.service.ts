import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GM_API_ENDPOINTS } from '../constants/gm-api.constants';
import { GmCoordinate, GmCustomerAddress, GmCustomerAddressPayload } from '../interfaces/location.interface';
import { GmApiService } from './gm-api.service';

interface GmCustomerAddressListResponse {
  addresses: GmCustomerAddress[];
}

interface GmCustomerAddressResponse {
  message: string;
  address: GmCustomerAddress;
}

@Injectable({ providedIn: 'root' })
export class GmCustomerAddressService {
  private readonly endpoint = GM_API_ENDPOINTS.customerAddresses;

  constructor(private api: GmApiService) {}

  getAddresses(): Observable<GmCustomerAddress[]> {
    return this.api.get<GmCustomerAddressListResponse>(this.endpoint).pipe(map((response) => response.addresses ?? []));
  }

  createAddress(payload: GmCustomerAddressPayload): Observable<GmCustomerAddress> {
    return this.api
      .post<GmCustomerAddressResponse>(this.endpoint, payload)
      .pipe(map((response) => response.address));
  }

  updateAddress(id: number, payload: Partial<GmCustomerAddressPayload>): Observable<GmCustomerAddress> {
    return this.api
      .patch<GmCustomerAddressResponse>(`${this.endpoint}/${id}`, payload)
      .pipe(map((response) => response.address));
  }

  setDefault(id: number): Observable<GmCustomerAddress> {
    return this.api
      .patch<GmCustomerAddressResponse>(`${this.endpoint}/${id}/set-default`, {})
      .pipe(map((response) => response.address));
  }

  deleteAddress(id: number): Observable<void> {
    return this.api.delete<{ message: string }>(`${this.endpoint}/${id}`).pipe(map(() => undefined));
  }

  toCoordinate(address: GmCustomerAddress): GmCoordinate {
    return {
      lat: Number(address.lat),
      lng: Number(address.lng),
      address: address.address,
    };
  }
}
