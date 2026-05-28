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
  unit?: string | null;
  phone?: string | null;
  contact_name?: string | null;
  contactName?: string | null;
  note?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface GmCustomerAddressDetails {
  unit: string;
  phone: string;
  contactName: string;
  note: string;
}

export interface GmCustomerAddressPayload {
  label?: string | null;
  address: string;
  lat: number;
  lng: number;
  unit?: string;
  phone?: string;
  contact_name?: string;
  contactName?: string;
  note?: string;
  is_default?: boolean;
}
