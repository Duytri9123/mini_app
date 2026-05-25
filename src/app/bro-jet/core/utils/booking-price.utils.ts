/**
 * Pure function to calculate the final booking amount after discounts.
 *
 * Rules:
 * - final_amount = MAX(0, baseAmount - voucherDiscount - pointsDiscount)
 * - pointsDiscount cannot exceed 50% of baseAmount
 * - voucher and points are mutually exclusive (cannot both be > 0)
 *
 * Validates: Yêu Cầu 6.9
 */
export function calculateFinalAmount(
  baseAmount: number,
  voucherDiscount: number,
  pointsDiscount: number,
): number {
  // Clamp negatives to 0
  const base = Math.max(0, baseAmount);
  const voucher = Math.max(0, voucherDiscount);
  const points = Math.max(0, pointsDiscount);

  // Points discount cannot exceed 50% of base amount
  const cappedPoints = Math.min(points, base * 0.5);

  // Mutual exclusion: if both are provided, voucher takes precedence
  // (in practice the UI prevents this, but the function enforces it)
  const effectiveVoucher = voucher;
  const effectivePoints = voucher > 0 ? 0 : cappedPoints;

  return Math.max(0, base - effectiveVoucher - effectivePoints);
}
