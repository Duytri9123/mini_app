// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface BjWallet {
  balance: number;
  totalTopup: number;
  /** Minimum topup amount in VND — driven by backend config */
  minTopupAmount: number;
  vietqrConfig?: BjVietQrConfig | null;
}

// ─── VietQR ───────────────────────────────────────────────────────────────────

export interface BjVietQrConfig {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  addInfo: string;
  template: string;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export type WalletTransactionType = 'topup' | 'payment' | 'refund' | 'bonus' | 'withdraw';

export interface BjWalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

// ─── Banks ────────────────────────────────────────────────────────────────────

export interface BjBank {
  id: string;
  name: string;
  shortName: string;
  code: string;
  bin: string;
  logoUrl: string | null;
}

// ─── Withdraw Requests ────────────────────────────────────────────────────────

export type WithdrawStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface BjWithdrawRequest {
  id: string;
  amount: number;
  status: WithdrawStatus;
  rejectReason: string | null;
  accountNumber: string;
  accountHolder: string;
  bank: { id: string; shortName: string; logoUrl: string | null } | null;
  processedAt: string | null;
  createdAt: string;
}

// ─── Realtime events ──────────────────────────────────────────────────────────

export interface WalletTopupEvent {
  reference: string;
  amount: number;
  payment_method: string;
  status: 'success' | 'failed';
}
