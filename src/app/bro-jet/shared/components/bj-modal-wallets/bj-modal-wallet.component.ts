import { Component, EventEmitter, Input, Output, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PresetAmount {
    label: string;
    value: number;
}

@Component({
    selector: 'app-bj-modal-wallet',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './bj-modal-wallet.component.html',
    styleUrls: ['./bj-modal-wallet.scss'],
})
export class BjModalWalletComponent {
    @Input() isOpen = false;
    @Input() presetAmounts: PresetAmount[] = [];
    @Input() selectedPreset: number | null = null;
    @Input() customAmount: number | null = null;
    @Input() topupAmount = 0;
    @Input() isTopupValid = false;
    @Input() minTopupAmount = 100_000;
    @Input() qrData: string | null = null;
    /** true khi QR đã hiển thị và đang chờ SEPAY xác nhận thanh toán */
    @Input() isWaitingPayment = false;

    @Output() close = new EventEmitter<void>();
    @Output() presetSelect = new EventEmitter<number>();
    @Output() customAmountChange = new EventEmitter<number | null>();
    @Output() confirmTopup = new EventEmitter<void>();

    // Swipe-to-dismiss state
    dragOffsetY = 0;
    isDragging = false;
    private startY = 0;
    private readonly DISMISS_THRESHOLD = 120;

    onClose(): void {
        this.close.emit();
    }

    onPresetSelect(amount: number): void {
        this.selectedPreset = amount;
        this.customAmount = amount;
        this.presetSelect.emit(amount);
    }

    onCustomAmountInput(value: number | null): void {
        this.selectedPreset = null;
        this.customAmount = value;
        this.customAmountChange.emit(value);
    }

    onConfirm(): void {
        this.confirmTopup.emit();
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
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
