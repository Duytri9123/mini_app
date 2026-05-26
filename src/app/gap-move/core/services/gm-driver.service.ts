import { Injectable } from '@angular/core';
import { map, Observable, of, timer } from 'rxjs';
import { GmDriver } from '../interfaces/driver.interface';

const DEMO_DRIVERS: GmDriver[] = [
  {
    id: 'driver-1',
    fullName: 'Nguyen Minh Quan',
    phone: '0901000001',
    rating: 4.9,
    totalTrips: 1280,
    status: 'available',
    vehicle: {
      id: 'vehicle-driver-1',
      name: 'Honda Air Blade',
      licensePlate: '59A1-12345',
      vehicleType: 'motorbike',
      isDefault: true,
    },
    currentLocation: { lat: 10.779, lng: 106.699, address: 'Ben Thanh' },
  },
  {
    id: 'driver-2',
    fullName: 'Tran Gia Bao',
    phone: '0901000002',
    rating: 4.8,
    totalTrips: 870,
    status: 'available',
    vehicle: {
      id: 'vehicle-driver-2',
      name: 'Toyota Vios',
      licensePlate: '51F-67890',
      vehicleType: 'car',
      isDefault: true,
    },
    currentLocation: { lat: 10.783, lng: 106.704, address: 'Le Thanh Ton' },
  },
  {
    id: 'driver-3',
    fullName: 'Le Hoang Phuc',
    phone: '0901000003',
    rating: 4.85,
    totalTrips: 540,
    status: 'available',
    vehicle: {
      id: 'vehicle-driver-3',
      name: 'Suzuki Blind Van',
      licensePlate: '51D-45678',
      vehicleType: 'van',
      maxWeightKg: 500,
      isDefault: true,
    },
    currentLocation: { lat: 10.771, lng: 106.69, address: 'Cong Quynh' },
  },
  {
    id: 'driver-4',
    fullName: 'Pham Duc Anh',
    phone: '0901000004',
    rating: 4.92,
    totalTrips: 760,
    status: 'available',
    vehicle: {
      id: 'vehicle-driver-4',
      name: 'Isuzu 1.5 tan',
      licensePlate: '50H-11223',
      vehicleType: 'truck',
      maxWeightKg: 1500,
      isDefault: true,
    },
    currentLocation: { lat: 10.789, lng: 106.696, address: 'Da Kao' },
  },
];

@Injectable({ providedIn: 'root' })
export class GmDriverService {
  getNearbyDrivers(): Observable<GmDriver[]> {
    return timer(0, 1800).pipe(map((tick) => this.moveDrivers(tick)));
  }

  findAvailableDriver(vehicleType = 'motorbike'): Observable<GmDriver | null> {
    return of(DEMO_DRIVERS.find((driver) => driver.vehicle.vehicleType === vehicleType) ?? DEMO_DRIVERS[0] ?? null);
  }

  private moveDrivers(tick: number): GmDriver[] {
    return DEMO_DRIVERS.map((driver, index) => {
      const base = driver.currentLocation;
      if (!base) {
        return driver;
      }

      const angle = tick / 3 + index * 1.1;
      const radius = 0.0016 + index * 0.00025;
      return {
        ...driver,
        currentLocation: {
          ...base,
          lat: base.lat + Math.sin(angle) * radius,
          lng: base.lng + Math.cos(angle) * radius,
        },
      };
    });
  }
}
