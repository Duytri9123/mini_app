import { GmCoordinate } from '../../interfaces/location.interface';

export interface GmMapMarker {
  id: string;
  label: string;
  coordinate: GmCoordinate;
  kind: 'pickup' | 'dropoff' | 'driver' | 'stop';
}

export function buildRouteMarkers(pickup: GmCoordinate, dropoff: GmCoordinate): GmMapMarker[] {
  return [
    { id: 'pickup', label: 'Pickup', coordinate: pickup, kind: 'pickup' },
    { id: 'dropoff', label: 'Dropoff', coordinate: dropoff, kind: 'dropoff' },
  ];
}
