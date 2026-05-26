import { GmCoordinate } from '../interfaces/location.interface';

const EARTH_RADIUS_KM = 6371;

export function calculateDistanceKm(from: GmCoordinate, to: GmCoordinate): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateDurationMin(distanceKm: number, averageSpeedKmh = 24): number {
  if (averageSpeedKmh <= 0) {
    return 0;
  }

  return Math.ceil((Math.max(0, distanceKm) / averageSpeedKmh) * 60);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
