import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { GmWallet, GmWalletTransaction } from '../interfaces/wallet.interface';

@Injectable({ providedIn: 'root' })
export class GmWalletService {
  getWallet(): Observable<GmWallet> {
    return of({
      id: 'wallet-1',
      balance: 420000,
      currency: 'VND',
      rewardPoints: 1280,
      lockedAmount: 0,
    });
  }

  getTransactions(): Observable<GmWalletTransaction[]> {
    return of([
      {
        id: 'txn-1',
        type: 'payment',
        status: 'completed',
        amount: -51200,
        description: 'Thanh toan chuyen di GM-1001',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'txn-2',
        type: 'topup',
        status: 'completed',
        amount: 200000,
        description: 'Nap tien qua VNPay',
        createdAt: new Date().toISOString(),
      },
    ]);
  }
}
