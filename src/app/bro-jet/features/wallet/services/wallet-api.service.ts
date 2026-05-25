import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BjApiService } from '../../../core/services/bj-api.service';
import { BjBank, BjWallet, BjWalletTransaction, BjWithdrawRequest } from '../interfaces/wallet.types';

export interface WalletTransactionPage {
  data: BjWalletTransaction[];
  total: number;
}

export interface WithdrawRequestPage {
  data: BjWithdrawRequest[];
  total: number;
}

export interface CreateWithdrawPayload {
  bank_id: string;
  account_number: string;
  account_holder: string;
  amount: number;
}

export interface WithdrawActionResponse {
  message: string;
  status?: string;
  requestId?: string;
}

/**
 * Handles all HTTP calls related to the wallet feature.
 * No business logic — pure API communication layer.
 */
@Injectable({ providedIn: 'root' })
export class WalletApiService {
  constructor(private api: BjApiService) {}

  getBalance(): Observable<BjWallet> {
    return this.api.get('wallet/balance') as Observable<BjWallet>;
  }

  getTransactions(page: number, limit: number): Observable<WalletTransactionPage> {
    return this.api.get(`wallet/transactions?page=${page}&limit=${limit}`) as Observable<WalletTransactionPage>;
  }

  getBanks(): Observable<{ data: BjBank[] }> {
    return this.api.get('wallet/banks') as Observable<{ data: BjBank[] }>;
  }

  getWithdrawRequests(page = 1, limit = 10): Observable<WithdrawRequestPage> {
    return this.api.get(`wallet/withdraw-requests?page=${page}&limit=${limit}`) as Observable<WithdrawRequestPage>;
  }

  createWithdrawRequest(payload: CreateWithdrawPayload): Observable<{ message: string; requestId: string; status: string }> {
    return this.api.post('wallet/withdraw-requests', payload) as Observable<any>;
  }

  cancelWithdrawRequest(id: string): Observable<{ message: string }> {
    return this.api.delete(`wallet/withdraw-requests/${id}`) as Observable<any>;
  }
}
