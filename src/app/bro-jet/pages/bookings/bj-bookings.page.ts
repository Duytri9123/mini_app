import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  IonContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  InfiniteScrollCustomEvent,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { BjBookingService } from '../../core/services/bj-booking.service';
import { BjBooking, BookingStatus } from '../../core/interfaces/booking.interface';
import { BjBookingCardComponent } from '../../shared/components/bj-booking-card/bj-booking-card.component';
import { BjEmptyStateComponent } from '../../shared/components/bj-empty-state/bj-empty-state.component';
import { BJ_ICONS } from '../../shared/icons/bj-icons';
import { register } from 'swiper/element/bundle';

register();

type TabFilter = 'all' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

interface TabOption {
  label: string;
  value: TabFilter;
}

@Component({
  selector: 'app-bj-bookings',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
    BjBookingCardComponent,
    BjEmptyStateComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './bj-bookings.page.html',
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    swiper-container {
      flex: 1;
      width: 100%;
    }
    swiper-slide {
      height: auto;
    }
  `],
})
export class BjBookingsPage implements OnInit, AfterViewInit {
  @ViewChild('swiperEl', { static: false }) swiperRef!: ElementRef;

  readonly tabs: TabOption[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Sắp tới', value: 'confirmed' },
    { label: 'Đang rửa', value: 'in_progress' },
    { label: 'Hoàn thành', value: 'completed' },
    { label: 'Đã hủy', value: 'cancelled' },
  ];

  activeTab: TabFilter = 'all';
  activeSlideIndex = 0;
  searchQuery = '';
  isLoading = false;
  hasMore = true;

  searchIcon: SafeHtml;

  // Data cache per tab
  private tabData: Map<TabFilter, { bookings: BjBooking[], grouped: { month: string, items: BjBooking[] }[], page: number, hasMore: boolean }> = new Map();

  private page = 1;
  private readonly limit = 10;

  readonly emptyIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>`;

  constructor(
    private bookingService: BjBookingService,
    private router: Router,
    private sanitizer: DomSanitizer,
  ) {
    this.searchIcon = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS.SEARCH);
  }

  ngOnInit(): void {
    this.loadBookings(true);
  }

  ngAfterViewInit(): void {
    // Swiper element is ready after view init
    const swiperEl = this.swiperRef?.nativeElement;
    if (swiperEl) {
      const params = {
        slidesPerView: 1,
        speed: 300,
        cssMode: false,
      };
      Object.assign(swiperEl, params);
      swiperEl.initialize?.();
    }
  }

  // ─── Tab & Swiper sync ───

  onTabClick(index: number): void {
    this.activeSlideIndex = index;
    this.activeTab = this.tabs[index].value;

    const swiperEl = this.swiperRef?.nativeElement;
    if (swiperEl?.swiper) {
      swiperEl.swiper.slideTo(index);
    }

    this.loadBookings(true);
  }

  onSlideChange(event: any): void {
    const swiperEl = this.swiperRef?.nativeElement;
    const swiper = swiperEl?.swiper;
    if (!swiper) return;

    const index = swiper.activeIndex;
    if (index >= 0 && index < this.tabs.length) {
      this.activeSlideIndex = index;
      this.activeTab = this.tabs[index].value;
      this.loadBookings(true);
    }
  }

  onTabChange(event: any): void {
    this.activeTab = event.detail.value as TabFilter;
    const index = this.tabs.findIndex(t => t.value === this.activeTab);
    this.onTabClick(index);
  }

  // ─── Data access per tab ───

  get bookings(): BjBooking[] {
    return this.getTabBookings(this.activeTab);
  }

  get groupedBookings(): { month: string, items: BjBooking[] }[] {
    return this.getTabGroupedBookings(this.activeTab);
  }

  getTabBookings(tab: TabFilter): BjBooking[] {
    return this.tabData.get(tab)?.bookings ?? [];
  }

  getTabGroupedBookings(tab: TabFilter): { month: string, items: BjBooking[] }[] {
    return this.tabData.get(tab)?.grouped ?? [];
  }

  // ─── Search ───

  onSearch(event: any): void {
    this.searchQuery = event.target.value;
    this.loadBookings(true);
  }

  // ─── Refresh & Scroll ───

  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    await this.loadBookings(true);
    event.detail.complete();
  }

  async onInfiniteScroll(event: InfiniteScrollCustomEvent): Promise<void> {
    await this.loadBookings(false);
    event.target.complete();
  }

  // ─── Navigation ───

  onDetailClick(booking: BjBooking): void {
    this.router.navigate(['/bro-jet/booking', booking.id]);
  }

  onCancelClick(booking: BjBooking): void {
    this.router.navigate(['/bro-jet/booking', booking.id]);
  }

  onExploreClick(): void {
    this.router.navigate(['/bro-jet/explore']);
  }

  // ─── Data Loading ───

  private loadBookings(reset: boolean): Promise<void> {
    return new Promise((resolve) => {
      const currentTab = this.activeTab;
      let tabState = this.tabData.get(currentTab);

      if (reset) {
        tabState = { bookings: [], grouped: [], page: 1, hasMore: true };
        this.tabData.set(currentTab, tabState);
      }

      if (!tabState) {
        tabState = { bookings: [], grouped: [], page: 1, hasMore: true };
        this.tabData.set(currentTab, tabState);
      }

      if (!tabState.hasMore && !reset) {
        resolve();
        return;
      }

      if (reset) {
        this.isLoading = true;
      }

      const status = currentTab === 'all' ? undefined : (currentTab as BookingStatus);

      this.bookingService.getBookingHistory(tabState.page, this.limit, status).subscribe({
        next: (response) => {
          const newItems = response.data ?? [];
          tabState!.bookings = reset ? newItems : [...tabState!.bookings, ...newItems];
          tabState!.grouped = this.groupBookings(tabState!.bookings);
          tabState!.hasMore = tabState!.bookings.length < response.total;
          tabState!.page++;
          this.hasMore = tabState!.hasMore;
          this.isLoading = false;
          resolve();
        },
        error: () => {
          this.isLoading = false;
          resolve();
        },
      });
    });
  }

  private groupBookings(bookings: BjBooking[]): { month: string, items: BjBooking[] }[] {
    const groups: Record<string, BjBooking[]> = {};

    bookings.forEach(booking => {
      const date = new Date(booking.scheduledAt);
      const monthYear = `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(booking);
    });

    return Object.keys(groups).map(month => ({
      month,
      items: groups[month]
    }));
  }
}
