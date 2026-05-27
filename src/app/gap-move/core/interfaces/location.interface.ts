export interface GmCoordinate {
  lat: number;
  lng: number;
  address?: string;
}

export interface GmAddressStop {
  id: string;
  label: string;
  address: string;
  coordinate: GmCoordinate;
  note?: string;
}

export interface GmCustomerAddress {
  id: number;
  customer_id: number;
  label: string | null;
  address: string;
  lat: string;
  lng: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface GmCustomerAddressPayload {
  label?: string | null;
  address: string;
  lat: number;
  lng: number;
  is_default?: boolean;
}
