import { GmBookingType } from '../../core/interfaces/booking.interface';
import { GmCoordinate } from '../../core/interfaces/location.interface';
import { GmVehicleType } from '../../core/interfaces/vehicle.interface';
import { GmAddressSearchResult } from '../../core/services/gm-geocoding.service';

export type GmHomeMode = 'delivery' | 'ride';
export type GmHomeAddressField = 'pickup' | 'dropoff' | 'stop';

export interface GmHomeModeOption {
  id: GmHomeMode;
  label: string;
  badge?: string;
}

export interface GmHomeVehicleOption {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon: string;
  artClass: string;
  imageUrl?: string;
  bookingType: GmBookingType;
  vehicleType: GmVehicleType;
  dimensions?: string;
  maxWeightKg?: number;
  priceBase?: number;
  showMore?: boolean;
}

export interface GmHomeAddressDetails {
  unit: string;
  phone: string;
  contactName: string;
  note: string;
  saveAddress: boolean;
}

export interface GmHomeDeliveryPackage {
  id: 'express' | 'standard' | 'saving';
  title: string;
  subtitle: string;
  priceMultiplier: number;
}

export interface GmHomeRoutePointState {
  address: string;
  coordinate?: GmCoordinate;
  details: GmHomeAddressDetails;
  suggestions: GmAddressSearchResult[];
}

export interface GmHomeConfirmedAddressHistoryItem {
  id: string;
  address: string;
  coordinate: GmCoordinate;
  details: GmHomeAddressDetails;
  confirmedAt: number;
}

export interface GmHomeRouteDragGhost {
  address: string;
  placeholder: string;
  details: GmHomeAddressDetails;
  marker: 'pickup' | 'stop' | 'dropoff';
  left: number;
  top: number;
  width: number;
  height: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  removable: boolean;
}
