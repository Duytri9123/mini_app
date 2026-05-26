import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GmWalletRealtimeService {
  private readonly balanceSubject = new BehaviorSubject<number>(420000);
  readonly balance$ = this.balanceSubject.asObservable();

  updateBalance(balance: number): void {
    this.balanceSubject.next(Math.max(0, balance));
  }
}
