import { GmCoordinate } from './location.interface';
import { GmVehicle } from './vehicle.interface';

export type GmDriverStatus = 'available' | 'busy' | 'offline';

export interface GmDriver {
  id: string;
  fullName: string;
  phone: string;
  avatarUrl?: string | null;
  rating: number;
  totalTrips: number;
  status: GmDriverStatus;
  vehicle: GmVehicle;
  currentLocation?: GmCoordinate;
}
