import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BjBank } from '../../../features/wallet/interfaces/wallet.types';
import { CreateWithdrawPayload } from '../../../features/wallet/services/wallet-api.service';

@Component({
  selector: 'app-bj-modal-withdraw',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bj-modal-withdraw.component.html',
})
export class BjModalWithdrawComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() banks: BjBank[] = [];
  @Input() currentBalance = 0;
  @Input() isSubmitting = false;

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<CreateWithdrawPayload>();

  // Form state
  selectedBankId = '';
  accountNumber  = '';
  accountHolder  = '';
  amount: number | null = null;

  // Swipe-to-dismiss state
  dragOffsetY = 0;
  isDragging = false;
  private startY = 0;
  private readonly DISMISS_THRESHOLD = 120;

  readonly STEP = 50_000;
  readonly PRESETS = [100_000, 200_000, 500_000, 1_000_000];

  get selectedBank(): BjBank | undefined {
    return this.banks.find(b => b.id === this.selectedBankId);
  }

  private get normalizedAmount(): number | null {
    if (this.amount === null || this.amount === undefined) return null;
    const numeric = Number(this.amount);
    return Number.isFinite(numeric) ? numeric : null;
  }

  get amountError(): string | null {
    const amount = this.normalizedAmount;
    if (amount === null) return null;
    if (amount > this.currentBalance) return 'Số tiền vượt quá số dư hiện tại.';
    if (amount % this.STEP !== 0) return `Số tiền phải chia hết cho ${this.formatCurrency(this.STEP)}.`;
    return null;
  }

  get isValid(): boolean {
    const amount = this.normalizedAmount;
    return !!(
      this.selectedBankId &&
      this.accountNumber.trim() &&
      this.accountHolder.trim() &&
      amount !== null &&
      amount > 0 &&
      !this.amountError
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.reset();
    }
  }

  selectPreset(value: number): void {
    this.amount = value;
  }

  onSubmit(): void {
    const amount = this.normalizedAmount;
    if (!this.isValid || amount === null) return;
    this.submit.emit({
      bank_id:        this.selectedBankId,
      account_number: this.accountNumber.trim(),
      account_holder: this.accountHolder.trim(),
      amount:         amount,
    });
  }

  onClose(): void {
    this.close.emit();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  private reset(): void {
    this.selectedBankId = '';
    this.accountNumber  = '';
    this.accountHolder  = '';
    this.amount         = null;
  }

  // ─── Swipe-to-dismiss ─────────────────────────────────────────────────────
  onDragStart(event: TouchEvent): void {
    this.isDragging = true;
    this.startY = event.touches[0].clientY;
  }

  onDragMove(event: TouchEvent): void {
    if (!this.isDragging) return;
    const deltaY = event.touches[0].clientY - this.startY;
    this.dragOffsetY = Math.max(0, deltaY);
  }

  onDragEnd(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    if (this.dragOffsetY > this.DISMISS_THRESHOLD) {
      this.onClose();
    }
    this.dragOffsetY = 0;
  }
}
