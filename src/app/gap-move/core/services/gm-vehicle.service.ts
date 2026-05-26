import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GmVehicle } from '../interfaces/vehicle.interface';
import { createId } from '../utils/helpers';

@Injectable({ providedIn: 'root' })
export class GmVehicleService {
  private readonly vehicles$ = new BehaviorSubject<GmVehicle[]>([
    {
      id: 'vehicle-1',
      name: 'Xe may ca nhan',
      licensePlate: '59A1-22222',
      vehicleType: 'motorbike',
      brand: 'Honda',
      model: 'Vision',
      color: 'Trang',
      isDefault: true,
    },
  ]);

  getVehicles(): Observable<GmVehicle[]> {
    return this.vehicles$.asObservable();
  }

  addVehicle(vehicle: Omit<GmVehicle, 'id'>): GmVehicle {
    const created = { ...vehicle, id: createId('vehicle') };
    this.vehicles$.next([created, ...this.vehicles$.getValue()]);
    return created;
  }
}
