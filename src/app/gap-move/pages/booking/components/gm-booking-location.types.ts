import { GmAddressSearchResult } from '../../../core/services/gm-geocoding.service';
import { GmCustomerAddress } from '../../../core/interfaces/location.interface';

export type GmBookingAddressField = 'pickup' | 'dropoff' | 'stop';

export interface GmBookingAddressTarget {
  field: GmBookingAddressField;
  stopIndex?: number;
}

export interface GmBookingSuggestionSelection extends GmBookingAddressTarget {
  result: GmAddressSearchResult;
}

export interface GmBookingSavedAddressSelection extends GmBookingAddressTarget {
  address: GmCustomerAddress;
}

export interface GmBookingStopAddressChange {
  index: number;
  address: string;
}

export interface GmBookingDestinationPointMove {
  fromIndex: number;
  toIndex: number;
}
