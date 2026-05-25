/**
 * Pure utility functions for wallet transaction processing.
 *
 * Thuộc Tính 2: Ví không bao giờ âm
 * - balance >= 0 after any sequence of valid transactions
 * - balance = total_topup - total_spent
 *
 * Validates: Yêu Cầu 5.4, 5.5
 */

export interface WalletTx {
  type: 'topup' | 'payment' | 'refund';
  amount: number;
}

export interface WalletState {
  balance: number;
  totalTopup: number;
  totalSpent: number;
}

/**
 * Apply a sequence of wallet transactions and return the resulting wallet state.
 *
 * Rules:
 * - topup: adds to balance and totalTopup
 * - payment: subtracts from balance and adds to totalSpent (only if balance >= amount)
 * - refund: adds to balance and subtracts from totalSpent (capped so totalSpent >= 0)
 * - balance must never go negative (payment is rejected if insufficient funds)
 */
export function applyWalletTransactions(transactions: WalletTx[]): WalletState {
  let balance = 0;
  let totalTopup = 0;
  let totalSpent = 0;

  for (const tx of transactions) {
    const amount = Math.max(0, tx.amount); // ignore negative amounts

    switch (tx.type) {
      case 'topup':
        balance += amount;
        totalTopup += amount;
        break;

      case 'payment':
        // Reject payment if insufficient funds
        if (balance >= amount) {
          balance -= amount;
          totalSpent += amount;
        }
        break;

      case 'refund':
        // Refund cannot exceed what was spent
        const refundAmount = Math.min(amount, totalSpent);
        balance += refundAmount;
        totalSpent -= refundAmount;
        break;
    }
  }

  return { balance, totalTopup, totalSpent };
}
