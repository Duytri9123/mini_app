export type GmWalletTransactionType = 'topup' | 'payment' | 'refund' | 'withdraw';
export type GmWalletTransactionStatus = 'pending' | 'completed' | 'failed';

export interface GmWallet {
  id: string;
  balance: number;
  currency: 'VND';
  rewardPoints: number;
  lockedAmount: number;
}

export interface GmWalletTransaction {
  id: string;
  type: GmWalletTransactionType;
  status: GmWalletTransactionStatus;
  amount: number;
  description: string;
  createdAt: string;
}
