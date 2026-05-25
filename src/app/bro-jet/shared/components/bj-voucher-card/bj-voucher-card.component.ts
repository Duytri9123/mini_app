import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { BjVoucher } from '../../../core/services/bj-loyalty.service';
import { BJ_ICONS, BjIconKey } from '../../../shared/icons/bj-icons';

@Component({
  selector: 'app-bj-voucher-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-voucher-card.component.html',
  host: { class: 'block' },
})
export class BjVoucherCardComponent {
  @Input() voucher!: BjVoucher;
  @Input() showAction = true;
  @Input() actionText = 'Sử dụng';
  @Output() actionClick = new EventEmitter<BjVoucher>();

  private readonly safeIcons = new Map<BjIconKey, SafeHtml>();

  constructor(private sanitizer: DomSanitizer) {}

  icon(key: BjIconKey): SafeHtml {
    const cached = this.safeIcons.get(key);
    if (cached) return cached;
    const safe = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS[key]);
    this.safeIcons.set(key, safe);
    return safe;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  formatDiscount(voucher: BjVoucher): string {
    if (voucher.discountType === 'percent') {
      return `Giảm ${voucher.discountValue}%`;
    }
    return `Giảm ${this.formatCurrency(voucher.discountValue)}`;
  }
}
