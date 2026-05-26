import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GmWalletService } from '../../core/services/gm-wallet.service';
import { formatVnd } from '../../core/utils/helpers';

@Component({
  selector: 'app-gm-wallet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gm-wallet.page.html',
})
export class GmWalletPage {
  wallet$ = this.walletService.getWallet();
  transactions$ = this.walletService.getTransactions();

  constructor(private walletService: GmWalletService) {}

  formatAmount(amount: number): string {
    return formatVnd(amount);
  }
}
