import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GmVietqrBuilderService {
  buildPayload(data: { bankCode: string; accountNumber: string; amount: number; content: string }): string {
    return [
      'VIETQR',
      data.bankCode,
      data.accountNumber,
      Math.max(0, data.amount),
      data.content.trim().replace(/\s+/g, ' '),
    ].join('|');
  }
}
