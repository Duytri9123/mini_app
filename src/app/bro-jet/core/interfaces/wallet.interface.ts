/**
 * Re-exports from the canonical wallet types location.
 * Kept for backward compatibility with existing imports.
 *
 * Prefer importing directly from:
 *   @app/bro-jet/features/wallet/interfaces/wallet.types
 */
export type {
  BjWallet,
  BjVietQrConfig,
  BjWalletTransaction,
  WalletTopupEvent,
  WalletTransactionType,
} from '../../features/wallet/interfaces/wallet.types';
