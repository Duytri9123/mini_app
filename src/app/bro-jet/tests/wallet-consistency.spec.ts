/**
 * Property-Based Tests: Wallet Consistency
 *
 * Thuộc Tính 2: Ví không bao giờ âm
 * - balance >= 0 after any sequence of valid transactions
 * - balance = total_topup - total_spent
 *
 * Validates: Yêu Cầu 5.4, 5.5
 */
import * as fc from 'fast-check';
import { applyWalletTransactions, WalletTx } from '../core/utils/wallet.utils';

// Arbitrary: a single wallet transaction with a positive amount
const walletTxArb: fc.Arbitrary<WalletTx> = fc.record({
  type: fc.constantFrom('topup', 'payment', 'refund') as fc.Arbitrary<WalletTx['type']>,
  amount: fc.float({ min: 0, max: 1_000_000, noNaN: true }),
});

// Arbitrary: a sequence of 0–50 transactions
const txSequenceArb = fc.array(walletTxArb, { minLength: 0, maxLength: 50 });

describe('applyWalletTransactions – wallet consistency', () => {

  // ── Property 2a: balance is always >= 0 ───────────────────────────────────
  // **Validates: Yêu Cầu 5.4, 5.5**
  it('Property 2: balance is always >= 0 after any sequence of transactions', () => {
    fc.assert(
      fc.property(txSequenceArb, (transactions) => {
        const state = applyWalletTransactions(transactions);
        return state.balance >= 0;
      }),
    );
  });

  // ── Property 2b: balance = totalTopup - totalSpent ────────────────────────
  // **Validates: Yêu Cầu 5.5**
  it('Property 2: balance equals totalTopup minus totalSpent after any sequence', () => {
    fc.assert(
      fc.property(txSequenceArb, (transactions) => {
        const state = applyWalletTransactions(transactions);
        return Math.abs(state.balance - (state.totalTopup - state.totalSpent)) < Number.EPSILON;
      }),
    );
  });

  // ── Property: payment rejected when balance < amount ──────────────────────
  // **Validates: Yêu Cầu 5.4**
  it('Property 2: payment is rejected (balance unchanged) when balance < payment amount', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 500_000, noNaN: true }),   // topup amount
        fc.float({ min: 0, max: 1_000_000, noNaN: true }), // payment amount
        (topupAmount, paymentAmount) => {
          // Only test the case where payment > topup (insufficient funds)
          fc.pre(paymentAmount > topupAmount);

          const state = applyWalletTransactions([
            { type: 'topup', amount: topupAmount },
            { type: 'payment', amount: paymentAmount },
          ]);

          // Payment should be rejected: balance stays at topupAmount, totalSpent stays 0
          return state.balance === topupAmount && state.totalSpent === 0;
        },
      ),
    );
  });

  // ── Example-based tests ────────────────────────────────────────────────────

  it('empty transaction list returns zero state', () => {
    const state = applyWalletTransactions([]);
    expect(state.balance).toBe(0);
    expect(state.totalTopup).toBe(0);
    expect(state.totalSpent).toBe(0);
  });

  it('topup increases balance and totalTopup', () => {
    const state = applyWalletTransactions([{ type: 'topup', amount: 100_000 }]);
    expect(state.balance).toBe(100_000);
    expect(state.totalTopup).toBe(100_000);
    expect(state.totalSpent).toBe(0);
  });

  it('payment reduces balance and increases totalSpent when funds are sufficient', () => {
    const state = applyWalletTransactions([
      { type: 'topup', amount: 200_000 },
      { type: 'payment', amount: 80_000 },
    ]);
    expect(state.balance).toBe(120_000);
    expect(state.totalTopup).toBe(200_000);
    expect(state.totalSpent).toBe(80_000);
  });

  it('payment is rejected when balance is insufficient', () => {
    const state = applyWalletTransactions([
      { type: 'topup', amount: 50_000 },
      { type: 'payment', amount: 100_000 },
    ]);
    expect(state.balance).toBe(50_000);
    expect(state.totalSpent).toBe(0);
  });

  it('refund restores balance and reduces totalSpent', () => {
    const state = applyWalletTransactions([
      { type: 'topup', amount: 200_000 },
      { type: 'payment', amount: 80_000 },
      { type: 'refund', amount: 80_000 },
    ]);
    expect(state.balance).toBe(200_000);
    expect(state.totalSpent).toBe(0);
    // balance = totalTopup - totalSpent
    expect(state.balance).toBe(state.totalTopup - state.totalSpent);
  });

  it('refund cannot exceed totalSpent', () => {
    const state = applyWalletTransactions([
      { type: 'topup', amount: 100_000 },
      { type: 'payment', amount: 30_000 },
      { type: 'refund', amount: 999_999 }, // way more than spent
    ]);
    // Only 30_000 was spent, so refund is capped at 30_000
    expect(state.totalSpent).toBe(0);
    expect(state.balance).toBe(100_000);
  });

  it('balance invariant holds after complex sequence', () => {
    const state = applyWalletTransactions([
      { type: 'topup', amount: 500_000 },
      { type: 'payment', amount: 150_000 },
      { type: 'topup', amount: 200_000 },
      { type: 'payment', amount: 300_000 },
      { type: 'refund', amount: 150_000 },
    ]);
    expect(state.balance).toBeGreaterThanOrEqual(0);
    expect(state.balance).toBe(state.totalTopup - state.totalSpent);
  });
});
