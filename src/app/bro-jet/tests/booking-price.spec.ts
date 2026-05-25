/**
 * Property-Based Tests: Booking Price Calculation
 *
 * Thuộc Tính 8: Giảm giá không vượt quá giá trị đơn hàng (final_amount >= 0)
 * Validates: Yêu Cầu 6.9
 */
import * as fc from 'fast-check';
import { calculateFinalAmount } from '../core/utils/booking-price.utils';

describe('calculateFinalAmount – booking price logic', () => {

  // ── Property 8: final_amount >= 0 ─────────────────────────────────────────
  // **Validates: Yêu Cầu 6.9**
  it('Property 8: final_amount is always >= 0 for any combination of discounts', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),  // baseAmount
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),  // voucherDiscount
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),  // pointsDiscount
        (baseAmount, voucherDiscount, pointsDiscount) => {
          const result = calculateFinalAmount(baseAmount, voucherDiscount, pointsDiscount);
          return result >= 0;
        },
      ),
    );
  });

  // ── Property: pointsDiscount capped at 50% of baseAmount ──────────────────
  // **Validates: Yêu Cầu 6.4**
  it('pointsDiscount cannot reduce the amount by more than 50% of baseAmount', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),  // baseAmount
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),  // pointsDiscount (no voucher)
        (baseAmount, pointsDiscount) => {
          const result = calculateFinalAmount(baseAmount, 0, pointsDiscount);
          // The discount applied from points must not exceed 50% of base
          const appliedDiscount = baseAmount - result;
          return appliedDiscount <= baseAmount * 0.5 + Number.EPSILON;
        },
      ),
    );
  });

  // ── Property: mutual exclusion – voucher and points cannot both apply ──────
  // **Validates: Yêu Cầu 6.5**
  it('when voucher is applied, pointsDiscount has no effect (mutual exclusion)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 1_000_000, noNaN: true }),  // baseAmount (> 0)
        fc.float({ min: 1, max: 500_000, noNaN: true }),    // voucherDiscount (> 0)
        fc.float({ min: 1, max: 500_000, noNaN: true }),    // pointsDiscount (> 0)
        (baseAmount, voucherDiscount, pointsDiscount) => {
          const withBoth = calculateFinalAmount(baseAmount, voucherDiscount, pointsDiscount);
          const withVoucherOnly = calculateFinalAmount(baseAmount, voucherDiscount, 0);
          // When voucher > 0, points should be ignored → same result
          return Math.abs(withBoth - withVoucherOnly) < Number.EPSILON;
        },
      ),
    );
  });

  // ── Example-based tests ────────────────────────────────────────────────────

  it('no discount: returns baseAmount', () => {
    expect(calculateFinalAmount(100_000, 0, 0)).toBe(100_000);
  });

  it('voucher discount reduces amount correctly', () => {
    expect(calculateFinalAmount(100_000, 20_000, 0)).toBe(80_000);
  });

  it('points discount capped at 50% of base', () => {
    // 60_000 points on 100_000 base → capped at 50_000
    expect(calculateFinalAmount(100_000, 0, 60_000)).toBe(50_000);
  });

  it('points discount within 50% applies fully', () => {
    expect(calculateFinalAmount(100_000, 0, 30_000)).toBe(70_000);
  });

  it('voucher larger than base → final_amount is 0', () => {
    expect(calculateFinalAmount(50_000, 80_000, 0)).toBe(0);
  });

  it('both voucher and points provided → only voucher applies', () => {
    expect(calculateFinalAmount(100_000, 20_000, 30_000)).toBe(80_000);
  });

  it('zero base amount → always returns 0', () => {
    expect(calculateFinalAmount(0, 10_000, 5_000)).toBe(0);
  });
});
