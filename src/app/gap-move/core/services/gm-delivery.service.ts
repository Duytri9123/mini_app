import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { GmDeliveryOrder, GmPackageSize } from '../interfaces/delivery.interface';

@Injectable({ providedIn: 'root' })
export class GmDeliveryService {
  getDeliveries(): Observable<GmDeliveryOrder[]> {
    return of([
      {
        id: 'delivery-1',
        trackingCode: 'GMD-2401',
        status: 'picked_up',
        packageSize: 'small',
        speed: 'express',
        pickup: {
          id: 'pickup-delivery-1',
          label: 'Lay hang',
          address: 'Nguyen Hue, Quan 1',
          coordinate: { lat: 10.773, lng: 106.703 },
        },
        dropoff: {
          id: 'dropoff-delivery-1',
          label: 'Giao hang',
          address: 'Landmark 81, Binh Thanh',
          coordinate: { lat: 10.795, lng: 106.721 },
        },
        recipientName: 'Anh Nam',
        recipientPhone: '0909000000',
        codAmount: 250000,
        finalAmount: 38000,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  getPackageSurcharge(size: GmPackageSize): number {
    return {
      document: 0,
      small: 3000,
      medium: 8000,
      large: 15000,
    }[size];
  }
}
