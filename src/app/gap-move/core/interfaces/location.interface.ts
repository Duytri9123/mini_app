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
