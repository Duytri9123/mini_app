import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BjApiService } from './bj-api.service';
import { BjVehicle } from '../interfaces/vehicle.interface';

export interface BjCreateVehicleRequest {
  licensePlate: string;
  name?: string;
  brand: string;
  model: string;
  color: string;
  image?: File | null;
  isDefault?: boolean;
}

export type BjUpdateVehicleRequest = Partial<BjCreateVehicleRequest>;

@Injectable({ providedIn: 'root' })
export class BjVehicleService {
  private readonly endpoint = 'vehicles';

  constructor(private api: BjApiService) {}

  getVehicles(): Observable<BjVehicle[]> {
    return (this.api.get(this.endpoint) as Observable<any[]>).pipe(
      map(vehicles => vehicles.map(v => ({
        ...v,
        name: v.name || v.vehicle_name || v.vehicleName
      } as BjVehicle)))
    );
  }
  
  getVehicle(id: string): Observable<BjVehicle> {
    return (this.api.get(`${this.endpoint}/${id}`) as Observable<any>).pipe(
      map(v => ({
        ...v,
        name: v.name || v.vehicle_name || v.vehicleName
      } as BjVehicle))
    );
  }

  addVehicle(data: BjCreateVehicleRequest): Observable<BjVehicle> {
    const formData = this.toFormData(data);
    return this.api.post(this.endpoint, formData) as Observable<BjVehicle>;
  }

  updateVehicle(id: string, data: BjUpdateVehicleRequest): Observable<BjVehicle> {
    const formData = this.toFormData(data);
    // Use POST with method override or just POST if backend supports it for multipart PATCH
    // The doc says PUT or PATCH, but for multipart it's often easier with POST
    return this.api.post(`${this.endpoint}/${id}`, formData) as Observable<BjVehicle>;
  }

  deleteVehicle(id: string): Observable<unknown> {
    return this.api.delete(`${this.endpoint}/${id}`);
  }

  setDefaultVehicle(id: string): Observable<BjVehicle> {
    return this.api.patch(`${this.endpoint}/${id}/set-default`, {}) as Observable<BjVehicle>;
  }

  private toFormData(data: any): FormData {
    const formData = new FormData();
    if (data.licensePlate) formData.append('license_plate', data.licensePlate);
    if (data.name) formData.append('vehicle_name', data.name);
    if (data.brand) formData.append('brand', data.brand);
    if (data.model) formData.append('model', data.model);
    if (data.color) formData.append('color', data.color);
    if (data.image) formData.append('image', data.image);
    if (data.isDefault !== undefined) formData.append('is_default', data.isDefault ? '1' : '0');
    
    // Add _method patch for Laravel to handle multipart PATCH
    if (data.id || (data as any)._isUpdate) {
       formData.append('_method', 'PATCH');
    }

    return formData;
  }
}
