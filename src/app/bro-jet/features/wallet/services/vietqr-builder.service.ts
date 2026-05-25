import { Injectable } from '@angular/core';
import { BjVietQrConfig } from '../interfaces/wallet.types';

@Injectable({ providedIn: 'root' })
export class VietQrBuilderService {
  private readonly BASE_URL = 'https://img.vietqr.io/image';

  buildUrl(config: BjVietQrConfig, amount: number): string | null {
    try {
      if (!config.bankBin || !config.accountNumber || amount <= 0) {
        return null;
      }

      const path = `${this.BASE_URL}/${config.bankBin}-${config.accountNumber}-${config.template}.png`;

      const params = new URLSearchParams({
        amount:      String(Math.round(amount)),
        addInfo:     config.addInfo,
        accountName: config.accountName,
      });

      return `${path}?${params.toString()}`;
    } catch (e) {
      console.error('[VietQrBuilderService] Failed to build URL:', e);
      return null;
    }
  }
}
