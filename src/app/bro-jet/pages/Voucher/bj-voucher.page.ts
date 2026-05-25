import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonSpinner, NavController } from '@ionic/angular/standalone';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BjNavbarComponent, BjNavbarItem } from '../../shared/components/bj-navbar/bj-navbar.component';
import { BjEmptyStateComponent } from '../../shared/components/bj-empty-state/bj-empty-state.component';
import { BjVoucherCardComponent } from '../../shared/components/bj-voucher-card/bj-voucher-card.component';
import { BjLoyaltyService, BjVoucher, BjVoucherValidation } from '../../core/services/bj-loyalty.service';
import { BjToastService } from '../../core/services/bj-toast.service';
import { BJ_ICONS } from '../../shared/icons/bj-icons';

@Component({
    selector: 'app-bj-voucher',
    standalone: true,
    imports: [CommonModule, FormsModule, IonContent, IonSpinner, BjNavbarComponent, BjEmptyStateComponent, BjVoucherCardComponent],
    templateUrl: './bj-voucher.page.html',
})
export class BjVoucherPage implements OnInit {
    activeTab = 'all';

    // Voucher list
    allVouchers: BjVoucher[] = [];
    isLoadingVouchers = false;

    // Validate voucher
    voucherCode = '';
    bookingAmount = 0;
    isValidating = false;
    voucherError = '';
    voucherResult: BjVoucherValidation | null = null;

    readonly navItems: BjNavbarItem[] = [
        { key: 'all', label: 'Tất cả' },
        { key: 'promotion', label: 'Khuyến mại' },
        { key: 'service', label: 'Dịch vụ' },
        { key: 'member', label: 'Thành viên' },
    ];

    constructor(
        private loyaltyService: BjLoyaltyService,
        private toast: BjToastService,
        private sanitizer: DomSanitizer,
        private navCtrl: NavController,
    ) {
        this.voucherIcon = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS.VOUCHER);
        this.voucherIconLarge = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS.VOUCHER);
    }

    voucherIcon: SafeHtml;
    voucherIconLarge: SafeHtml;

    ngOnInit(): void {
        this.loadVouchers();
    }

    get visibleVouchers(): BjVoucher[] {
        if (this.activeTab === 'all') return this.allVouchers;
        return this.allVouchers.filter(v => v.status === this.activeTab);
    }

    onTabChange(key: string): void {
        this.activeTab = key;
    }

    validateVoucher(): void {
        const code = this.voucherCode.trim().toUpperCase();
        if (!code) {
            this.voucherError = 'Vui lòng nhập mã voucher';
            return;
        }

        this.isValidating = true;
        this.voucherError = '';
        this.voucherResult = null;

        this.loyaltyService.validateVoucher(code, this.bookingAmount || 0).subscribe({
            next: (res) => {
                this.isValidating = false;
                this.voucherResult = res;

                if (res.valid) {
                    this.toast.success(`Mã hợp lệ! Giảm ${this.formatCurrency(res.discount)}`);
                } else {
                    this.voucherError = res.error ?? 'Mã không hợp lệ';
                    this.toast.error(this.voucherError);
                }
            },
            error: (err) => {
                this.isValidating = false;
                const msg = err?.error?.message ?? 'Không thể kiểm tra mã. Vui lòng thử lại.';
                this.voucherError = msg;
                this.toast.error(msg);
            },
        });
    }

    clearVoucher(): void {
        this.voucherCode = '';
        this.voucherResult = null;
        this.voucherError = '';
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

    useVoucher(voucher: BjVoucher): void {
        this.navCtrl.navigateRoot(['/bro-jet/explore']);
    }

    private loadVouchers(): void {
        this.isLoadingVouchers = true;
        this.loyaltyService.getAvailableVouchers().subscribe({
            next: (vouchers) => {
                this.allVouchers = vouchers ?? [];
                this.isLoadingVouchers = false;
            },
            error: () => {
                this.isLoadingVouchers = false;
            },
        });
    }
}