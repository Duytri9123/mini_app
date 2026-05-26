import { GmBookingType, GmPorterOptions } from '../interfaces/booking.interface';
import { GmVehicleType } from '../interfaces/vehicle.interface';

export interface GmPriceInput {
  type: GmBookingType;
  vehicleType: GmVehicleType;
  distanceKm: number;
  durationMin: number;
  voucherDiscount?: number;
  walletDiscount?: number;
  surgeMultiplier?: number;
  porterOptions?: GmPorterOptions;
  additionalServiceCount?: number;
}

export interface GmPriceBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surcharge: number;
  porterFare: number;
  additionalServiceFare: number;
  discountAmount: number;
  finalAmount: number;
}

const BASE_FARE_BY_TYPE: Record<GmBookingType, number> = {
  ride: 12000,
  delivery: 15000,
  truck: 90000,
  moving: 180000,
  porter: 0,
  multi_stop: 25000,
};

const VEHICLE_MULTIPLIER: Record<GmVehicleType, number> = {
  motorbike: 1,
  car: 1.8,
  van: 2.4,
  truck: 3.2,
};

const PER_KM_RATE_BY_TYPE: Record<GmBookingType, number> = {
  ride: 5200,
  delivery: 6200,
  truck: 14500,
  moving: 16500,
  porter: 0,
  multi_stop: 6800,
};

const PER_MINUTE_RATE = 450;
const ADDITIONAL_SERVICE_FLAT_FARE = 10000;

export function calculateGapMovePrice(input: GmPriceInput): GmPriceBreakdown {
  const distanceKm = Math.max(0, input.distanceKm);
  const durationMin = Math.max(0, input.durationMin);
  const surgeMultiplier = Math.max(1, input.surgeMultiplier ?? 1);
  const vehicleMultiplier = VEHICLE_MULTIPLIER[input.vehicleType];

  const baseFare = BASE_FARE_BY_TYPE[input.type] * vehicleMultiplier;
  const distanceFare = distanceKm * PER_KM_RATE_BY_TYPE[input.type] * vehicleMultiplier;
  const timeFare = durationMin * PER_MINUTE_RATE;
  const porterFare = calculatePorterFare(input.porterOptions);
  const additionalServiceFare = Math.max(0, input.additionalServiceCount ?? 0) * ADDITIONAL_SERVICE_FLAT_FARE;
  const subtotal = baseFare + distanceFare + timeFare + porterFare + additionalServiceFare;
  const surcharge = Math.max(0, subtotal * (surgeMultiplier - 1));

  const voucherDiscount = Math.max(0, input.voucherDiscount ?? 0);
  const walletDiscount = Math.max(0, input.walletDiscount ?? 0);
  const maxWalletDiscount = subtotal * 0.5;
  const effectiveWalletDiscount = Math.min(walletDiscount, maxWalletDiscount);
  const discountAmount = voucherDiscount > 0 ? voucherDiscount : effectiveWalletDiscount;

  return {
    baseFare: roundCurrency(baseFare),
    distanceFare: roundCurrency(distanceFare),
    timeFare: roundCurrency(timeFare),
    surcharge: roundCurrency(surcharge),
    porterFare: roundCurrency(porterFare),
    additionalServiceFare: roundCurrency(additionalServiceFare),
    discountAmount: roundCurrency(discountAmount),
    finalAmount: roundCurrency(Math.max(0, subtotal + surcharge - discountAmount)),
  };
}

export function calculatePorterFare(options?: GmPorterOptions): number {
  if (!options?.enabled) {
    return 0;
  }

  const helperCount = Math.max(1, options.helperCount);
  const floorCount = Math.max(0, options.floorCount);
  const heavyItemCount = Math.max(0, options.heavyItemCount);
  const bulkyItemCount = Math.max(0, options.bulkyItemCount);
  const carryDistanceMeters = Math.max(0, options.carryDistanceMeters);
  const base = helperCount * 60000;
  const floorFare = options.hasElevator ? floorCount * 8000 : floorCount * helperCount * 18000;
  const heavyFare = heavyItemCount * 25000;
  const bulkyFare = bulkyItemCount * 35000;
  const distanceFare = Math.ceil(carryDistanceMeters / 25) * helperCount * 6000;
  const directionMultiplier = options.bothWays ? 1.6 : 1;

  return (base + floorFare + heavyFare + bulkyFare + distanceFare) * directionMultiplier;
}

export function roundCurrency(value: number): number {
  return Math.round(value / 100) * 100;
}
