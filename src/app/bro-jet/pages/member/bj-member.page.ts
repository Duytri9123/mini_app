import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonSpinner, NavController } from '@ionic/angular/standalone';
import { BJ_ICONS, BjIconKey } from '../../shared/icons/bj-icons';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BjUser } from '../../core/interfaces';
import { BjAuthService } from '../../core/services/bj-auth.service';
import { BjLoyaltyPoints, BjLoyaltyService, BjVoucher } from '../../core/services/bj-loyalty.service';
import { Subscription } from 'rxjs';
import { BjEmptyStateComponent } from '../../shared/components/bj-empty-state/bj-empty-state.component';
import { BjVoucherCardComponent } from '../../shared/components/bj-voucher-card/bj-voucher-card.component';

@Component({
    selector: 'app-bj-member',
    standalone: true,
    imports: [CommonModule, IonContent, IonHeader, IonSpinner, BjEmptyStateComponent, BjVoucherCardComponent],
    templateUrl: './bj-member.page.html',
})
export class BjMemberPage implements OnInit, OnDestroy {
    user: BjUser | null = null;
    loyaltyPoints: BjLoyaltyPoints | null = null;
    isLoadingPoints = false;

    vouchers: BjVoucher[] = [];
    isLoadingVouchers = false;

    private readonly safeIcons = new Map<BjIconKey, SafeHtml>();
    private sub?: Subscription;

    constructor(
        private readonly sanitizer: DomSanitizer,
        private readonly authService: BjAuthService,
        private readonly loyaltyService: BjLoyaltyService,
        private readonly navCtrl: NavController,
    ) { }

    ngOnInit(): void {
        this.user = this.authService.getCurrentUser();
        this.sub = this.authService.currentUser$.subscribe((u) => {
            this.user = u;
        });

        if (this.authService.isAuthenticated()) {
            this.authService.syncCurrentUser().subscribe({
                error: () => {
                    // Keep local cached profile when network request fails.
                },
            });
        }

        this.loadPoints();
        this.loadVouchers();
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    getInitials(fullName: string): string {
        if (!fullName) return '?';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }



    getNextTierLabel(): string {
        const points = this.loyaltyPoints?.available ?? 0;
        return points < 1000 ? 'Vàng' : 'Kim Cương';
    }

    getRemainingPoints(): number {
        const points = this.loyaltyPoints?.available ?? 0;
        const target = points < 1000 ? 1000 : 2000;
        return Math.max(target - points, 0);
    }

    getPointsPercent(): string {
        const points = this.loyaltyPoints?.available ?? 0;
        if (points < 1000) {
            return `${((points / 1000) * 100).toFixed(1)}%`;
        }
        if (points < 2000) {
            return `${(((points - 1000) / 1000) * 100).toFixed(1)}%`;
        }
        return '100%';
    }

    icon(key: BjIconKey): SafeHtml {
        const cached = this.safeIcons.get(key);
        if (cached) return cached;

        const safe = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS[key]);
        this.safeIcons.set(key, safe);
        return safe;
    }

    private loadPoints(): void {
        this.isLoadingPoints = true;
        this.loyaltyService.getPoints().subscribe({
            next: (points) => {
                this.loyaltyPoints = points;
                this.isLoadingPoints = false;
            },
            error: () => {
                this.isLoadingPoints = false;
            },
        });
    }

    private loadVouchers(): void {
        this.isLoadingVouchers = true;
        this.loyaltyService.getAvailableVouchers().subscribe({
            next: (vouchers) => {
                this.vouchers = vouchers ?? [];
                this.isLoadingVouchers = false;
            },
            error: () => {
                this.isLoadingVouchers = false;
            },
        });
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
        // Navigate to explore to start booking
        this.navCtrl.navigateRoot(['/bro-jet/explore']);
    }
}
