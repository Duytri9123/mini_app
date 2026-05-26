export type GmWalletTopupProvider = 'vnpay' | 'momo' | 'vietqr';

export interface GmWalletTopupRequest {
  amount: number;
  provider: GmWalletTopupProvider;
  returnUrl?: string;
}

export interface GmWalletTopupResult {
  paymentUrl?: string;
  qrPayload?: string;
  referenceCode: string;
}
