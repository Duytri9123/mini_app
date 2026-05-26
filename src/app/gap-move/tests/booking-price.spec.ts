import * as fc from 'fast-check';
import { calculateGapMovePrice } from '../core/utils/booking-price.utils';

describe('calculateGapMovePrice - GapMove pricing', () => {
  it('finalAmount is never negative', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 200, noNaN: true }),
        fc.float({ min: 0, max: 300, noNaN: true }),
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        (distanceKm, durationMin, voucherDiscount) => {
          const result = calculateGapMovePrice({
            type: 'delivery',
            vehicleType: 'motorbike',
            distanceKm,
            durationMin,
            voucherDiscount,
          });

          return result.finalAmount >= 0;
        },
      ),
    );
  });

  it('wallet discount cannot reduce more than 50 percent of subtotal', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 200, noNaN: true }),
        fc.float({ min: 0, max: 300, noNaN: true }),
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        (distanceKm, durationMin, walletDiscount) => {
          const result = calculateGapMovePrice({
            type: 'ride',
            vehicleType: 'motorbike',
            distanceKm,
            durationMin,
            walletDiscount,
          });
          const subtotal = result.baseFare + result.distanceFare + result.timeFare;

          return result.discountAmount <= subtotal * 0.5 + 100;
        },
      ),
    );
  });

  it('voucher takes precedence over wallet discount', () => {
    const withBoth = calculateGapMovePrice({
      type: 'ride',
      vehicleType: 'motorbike',
      distanceKm: 6,
      durationMin: 20,
      voucherDiscount: 10000,
      walletDiscount: 50000,
    });

    const withVoucherOnly = calculateGapMovePrice({
      type: 'ride',
      vehicleType: 'motorbike',
      distanceKm: 6,
      durationMin: 20,
      voucherDiscount: 10000,
    });

    expect(withBoth.finalAmount).toBe(withVoucherOnly.finalAmount);
  });

  it('larger vehicles cost more than motorbike for the same route', () => {
    const motorbike = calculateGapMovePrice({
      type: 'delivery',
      vehicleType: 'motorbike',
      distanceKm: 8,
      durationMin: 25,
    });

    const truck = calculateGapMovePrice({
      type: 'delivery',
      vehicleType: 'truck',
      distanceKm: 8,
      durationMin: 25,
    });

    expect(truck.finalAmount).toBeGreaterThan(motorbike.finalAmount);
  });
});
