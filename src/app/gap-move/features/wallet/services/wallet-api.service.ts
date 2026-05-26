import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { GmWalletTopupRequest, GmWalletTopupResult } from '../interfaces/wallet.types';

@Injectable({ providedIn: 'root' })
export class GmWalletApiService {
  createTopup(request: GmWalletTopupRequest): Observable<GmWalletTopupResult> {
    const referenceCode = `GM${Date.now()}`;
    return of({
      referenceCode,
      paymentUrl:
        request.provider === 'vietqr'
          ? undefined
          : `/gap-move/wallet/topup/${request.provider}?amount=${request.amount}&ref=${referenceCode}`,
      qrPayload:
        request.provider === 'vietqr'
          ? `GAPMOVE|TOPUP|${referenceCode}|${request.amount}`
          : undefined,
    });
  }
}
