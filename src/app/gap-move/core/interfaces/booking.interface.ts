import { GmDriver } from './driver.interface';
import { GmAddressStop } from './location.interface';
import { GmVehicleType } from './vehicle.interface';

export type GmBookingType = 'ride' | 'delivery' | 'truck' | 'moving' | 'porter' | 'multi_stop';
export type GmBookingStatus =
  | 'draft'
  | 'searching'
  | 'driver_assigned'
  | 'picked_up'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type GmPaymentMethod = 'cash' | 'wallet' | 'vnpay' | 'momo';
export type GmPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type GmAdditionalServiceKey =
  | 'extended_duration'
  | 'cold_chain'
  | 'cod'
  | 'fragile'
  | 'insurance'
  | 'porter'
  | 'packing'
  | 'assembly';

export interface GmPorterOptions {
  enabled: boolean;
  helperCount: number;
  floorCount: number;
  hasElevator: boolean;
  heavyItemCount: number;
  bulkyItemCount: number;
  carryDistanceMeters: number;
  bothWays: boolean;
}

export interface GmBooking {
  id: string;
  type: GmBookingType;
  status: GmBookingStatus;
  pickup: GmAddressStop;
  dropoff: GmAddressStop;
  stops?: GmAddressStop[];
  customerName?: string;
  driver?: GmDriver;
  vehicleType: GmVehicleType;
  scheduledAt?: string;
  distanceKm: number;
  durationMin: number;
  baseFare: number;
  distanceFare?: number;
  timeFare?: number;
  surcharge: number;
  porterFare?: number;
  additionalServiceFare?: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: GmPaymentMethod;
  paymentStatus: GmPaymentStatus;
  additionalServices?: GmAdditionalServiceKey[];
  porterOptions?: GmPorterOptions;
  packageInfo?: string;
  note?: string;
}

export interface GmCreateBookingRequest {
  type: GmBookingType;
  pickup: GmAddressStop;
  dropoff: GmAddressStop;
  stops?: GmAddressStop[];
  vehicleType: GmVehicleType;
  scheduledAt?: string;
  paymentMethod: GmPaymentMethod;
  additionalServices?: GmAdditionalServiceKey[];
  porterOptions?: GmPorterOptions;
  packageInfo?: string;
  promoCode?: string;
  note?: string;
}
