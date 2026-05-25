import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BjNavbarComponent, BjNavbarItem } from '../../shared/components/bj-navbar/bj-navbar.component';
import { BjEmptyStateComponent } from '../../shared/components/bj-empty-state/bj-empty-state.component';
import { BjFaqService } from '../../core/services/bj-faq.service';
import { BjFaqCategory } from '../../core/interfaces/faq.interface';
import { BJ_ICONS } from '../../shared/icons/bj-icons';

@Component({
    selector: 'app-bj-faq',
    standalone: true,
    imports: [CommonModule, IonContent, IonSpinner, BjNavbarComponent, BjEmptyStateComponent],
    templateUrl: './bj-faq.page.html',
})
export class BjFaqPage implements OnInit {
    activeTab = 'all';
    isLoading = false;
    allCategories: BjFaqCategory[] = [];
    expandedId: string | null = null;

    chevronIcon: SafeHtml;
    helpIcon: SafeHtml;
    private categoryIconCache = new Map<string, SafeHtml>();

    constructor(
        private readonly faqService: BjFaqService,
        private readonly router: Router,
        private readonly sanitizer: DomSanitizer,
    ) {
        this.chevronIcon = this.sanitizer.bypassSecurityTrustHtml(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
        );
        this.helpIcon = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS.HELP);
    }

    readonly navItems: BjNavbarItem[] = [
        { key: 'all', label: 'Tất cả' },
        { key: 'booking', label: 'Đặt lịch' },
        { key: 'payment', label: 'Thanh toán' },
        { key: 'voucher', label: 'Voucher' },
    ];

    private readonly categoryIcons: Record<string, string> = {
        booking: 'CALENDAR',
        payment: 'WALLET',
        voucher: 'VOUCHER',
    };

    ngOnInit(): void {
        this.loadFaqs();
    }

    onTabChange(key: string): void {
        this.activeTab = key;
        this.expandedId = null;
    }

    get visibleCategories(): BjFaqCategory[] {
        if (this.activeTab === 'all') {
            return this.allCategories;
        }

        return this.allCategories.filter((category) => category.slug === this.activeTab);
    }

    getCategoryIcon(slug: string): string {
        return this.categoryIcons[slug] ?? 'HELP';
    }

    getCategoryIconSvg(slug: string): SafeHtml {
        const cached = this.categoryIconCache.get(slug);
        if (cached) return cached;
        const key = this.categoryIcons[slug] ?? 'HELP';
        const svg = (BJ_ICONS as Record<string, string>)[key] ?? BJ_ICONS.HELP;
        const safe = this.sanitizer.bypassSecurityTrustHtml(svg);
        this.categoryIconCache.set(slug, safe);
        return safe;
    }

    toggleFaq(id: string): void {
        this.expandedId = this.expandedId === id ? null : id;
    }

    isExpanded(id: string): boolean {
        return this.expandedId === id;
    }

    onOpenSupportChat(): void {
        this.router.navigate(['/bro-jet/support-chat']);
    }

    private loadFaqs(): void {
        this.isLoading = true;
        this.faqService.getFaqs().subscribe({
            next: (response) => {
                this.allCategories = response.data ?? [];
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
            },
        });
    }
}
