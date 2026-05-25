import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonSpinner } from '@ionic/angular/standalone';
import { BjLoyaltyService, BjVoucher } from '../../../core/services/bj-loyalty.service';

@Component({
  selector: 'bj-voucher-picker',
  standalone: true,
  imports: [CommonModule, IonSpinner],
  templateUrl: './bj-voucher-picker.component.html',
})
export class BjVoucherPickerComponent implements OnInit {
  @Input() bookingAmount = 0;
  @Input() selectedCode = '';
  @Output() voucherSelected = new EventEmitter<BjVoucher>();
  @Output() closed = new EventEmitter<void>();

  vouchers: BjVoucher[] = [];
  loading = false;
  error = false;

  constructor(private loyaltyService: BjLoyaltyService) {}

  ngOnInit(): void {
    this.loading = true;
    this.loyaltyService.getAvailableVouchers().subscribe({
      next: (list) => {
        this.vouchers = list;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  canUse(v: BjVoucher): boolean {
    return v.status === 'active' && this.bookingAmount >= v.minOrder;
  }

  discountLabel(v: BjVoucher): string {
    if (v.discountType === 'percent') {
      const max = v.maxDiscount ? ` (tối đa ${this.fmt(v.maxDiscount)})` : '';
      return `Giảm ${v.discountValue}%${max}`;
    }
    return `Giảm ${this.fmt(v.discountValue)}`;
  }

  statusLabel(v: BjVoucher): string {
    if (v.status === 'used') return 'Đã hết lượt';
    if (v.status === 'expired') return 'Hết hạn';
    if (this.bookingAmount < v.minOrder) return `Đơn tối thiểu ${this.fmt(v.minOrder)}`;
    return '';
  }

  select(v: BjVoucher): void {
    if (!this.canUse(v)) return;
    this.voucherSelected.emit(v);
  }

  fmt(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }
}
