import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BjStationService } from '../../../core/services/bj-station.service';
import { BjReviewService, StationReviewItem } from '../../../core/services/bj-review.service';
import { BjServiceCardComponent } from '../bj-service-card/bj-service-card.component';
import { BjLoadingSpinnerComponent } from '../bj-loading-spinner/bj-loading-spinner.component';
import { BjErrorStateComponent } from '../bj-error-state/bj-error-state.component';
import { BjStation, BjServicePackage } from '../../../core/interfaces/station.interface';

@Component({
  selector: 'app-bj-station-detail',
  standalone: true,
  host: { class: 'block h-full' },
  imports: [CommonModule, RouterModule, BjServiceCardComponent, BjLoadingSpinnerComponent, BjErrorStateComponent],
  templateUrl: './bj-station-detail.component.html',
})
export class BjStationDetailComponent implements OnInit, OnDestroy, AfterViewInit {
    userLocation: { lat: number, lng: number } | null = null;
    distanceKm: number | null = null;
  @ViewChild('tabsContainer') tabsContainer?: ElementRef<HTMLElement>;

  @Input() set stationId(id: string | null) {
    if (id && id !== this._stationId) {
      this._stationId = id;
      if (this.isInitialized) {
        this._loadStation();
        if (this.activeTab === 'reviews') {
          this._loadReviews();
        }
      }
    }
  }
  @Input() showHeader = true;
  @Output() close = new EventEmitter<void>();

  station: BjStation | null = null;
  selectedPackage: BjServicePackage | null = null;
  loading = false;
  error = false;
  activeTab: 'info' | 'services' | 'amenities' | 'images' | 'reviews' = 'info';

  tabs = [
    {id: 'info', label: 'Thông tin'}, 
    {id: 'services', label: 'Dịch vụ'}, 
    {id: 'amenities', label: 'Tiện ích'},
    {id: 'images', label: 'Hình ảnh'},
    {id: 'reviews', label: 'Đánh giá'}
  ];

  isDown = false;
  isDragging = false;
  startX = 0;
  scrollLeftPos = 0;
  canScrollLeft = false;
  canScrollRight = true;

  reviews: StationReviewItem[] = [];
  loadingReviews = false;

  private _stationId = '';
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private stationService: BjStationService,
    private reviewService: BjReviewService,
  ) {}

  private isInitialized = false;

  ngOnInit(): void {
    this.isInitialized = true;
    if (this._stationId) {
      this._loadStation();
    }
    // Lấy vị trí người dùng nếu trình duyệt hỗ trợ
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          this.updateDistance();
        },
        () => {
          this.userLocation = null;
        }
      );
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.checkScroll(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: 'info' | 'services' | 'amenities' | 'images' | 'reviews'): void {
    if (this.isDragging) return;
    this.activeTab = tab;
    this.centerTab(tab);
    if (tab === 'reviews' && this._stationId) {
      this._loadReviews();
    }
  }

  centerTab(tabId: string): void {
    if (!this.tabsContainer) return;
    const container = this.tabsContainer.nativeElement;
    const tabEl = container.querySelector('#tab-' + tabId) as HTMLElement;
    if (tabEl) {
      const parentWidth = container.clientWidth;
      const tabWidth = tabEl.clientWidth;
      const tabLeft = tabEl.offsetLeft;
      const scrollPos = tabLeft - (parentWidth / 2) + (tabWidth / 2);
      
      container.scrollTo({
        left: scrollPos,
        behavior: 'smooth'
      });
    }
  }

  onMouseDown(e: MouseEvent): void {
    if (!this.tabsContainer) return;
    this.isDown = true;
    this.isDragging = false;
    const container = this.tabsContainer.nativeElement;
    container.classList.remove('scroll-smooth', 'snap-x', 'snap-mandatory');
    this.startX = e.pageX - container.offsetLeft;
    this.scrollLeftPos = container.scrollLeft;
  }

  onMouseLeave(): void {
    this.isDown = false;
    this.isDragging = false;
    this.restoreScrollBehavior();
  }

  onMouseUp(): void {
    this.isDown = false;
    setTimeout(() => this.isDragging = false, 0);
    this.restoreScrollBehavior();
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.isDown || !this.tabsContainer) return;
    const container = this.tabsContainer.nativeElement;
    const x = e.pageX - container.offsetLeft;
    const walk = (x - this.startX) * 2;
    if (Math.abs(x - this.startX) > 5) {
      this.isDragging = true;
      e.preventDefault();
      container.scrollLeft = this.scrollLeftPos - walk;
    }
  }

  private restoreScrollBehavior(): void {
    if (!this.tabsContainer) return;
    const container = this.tabsContainer.nativeElement;
    container.classList.add('scroll-smooth', 'snap-x', 'snap-mandatory');
  }

  onScroll(): void {
    this.checkScroll();
  }

  scrollTabs(direction: 'left' | 'right'): void {
    if (!this.tabsContainer) return;
    const container = this.tabsContainer.nativeElement;
    const scrollAmount = container.clientWidth * 0.6;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  }

  checkScroll(): void {
    if (!this.tabsContainer) return;
    const container = this.tabsContainer.nativeElement;
    this.canScrollLeft = container.scrollLeft > 2;
    this.canScrollRight = Math.ceil(container.scrollLeft + container.clientWidth) < container.scrollWidth - 2;
  }

  onPackageSelect(pkg: BjServicePackage): void {
    this.selectedPackage = this.selectedPackage?.id === pkg.id ? null : pkg;
  }

  onBookNow(): void {
    if (!this._stationId) return;
    const queryParams: Record<string, string> = { stationId: this._stationId };
    if (this.selectedPackage) {
      queryParams['packageId'] = this.selectedPackage.id;
    }
    this.router.navigate(['/bro-jet/booking/new'], { queryParams });
  }

  onClose(): void {
    this.close.emit();
  }

  get activePackages(): BjServicePackage[] {
    return this.station?.service_packages ?? [];
  }

  get formattedOpenHours(): string {
    if (!this.station) return '';
    const open = this.station.today_work_start_time?.substring(0, 5) ?? '08:00';
    const close = this.station.today_non_work_start_time?.substring(0, 5) ?? '20:00';
    return `${open} – ${close}`;
  }

  get formattedRating(): string {
    if (this.station?.rating == null) return '4.5';
    return this.station.rating.toFixed(1);
  }

  get isOpen(): boolean {
    if (!this.station) return false;
    if (this.station.status === 'inactive') return false;

    if (!this.station.today_work_start_time || !this.station.today_non_work_start_time) {
      return this.station.is_open_now !== false; 
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const start = parseTime(this.station.today_work_start_time);
    const end = parseTime(this.station.today_non_work_start_time);

    return currentTimeMinutes >= start && currentTimeMinutes <= end;
  }

  private _loadStation(): void {
    this.loading = true;
    this.error = false;
    this.stationService
      .getStationById(this._stationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (station) => {
          this.station = station;
          this.loading = false;
          this.updateDistance();
        },
        error: () => {
          this.error = true;
          this.loading = false;
        },
      });
  }

  updateDistance(): void {
    if (this.station?.latitude && this.station?.longitude && this.userLocation) {
      this.distanceKm = this.calculateDistance(
        this.userLocation.lat,
        this.userLocation.lng,
        this.station.latitude,
        this.station.longitude
      );
    } else {
      this.distanceKm = null;
    }
  }

  // Haversine formula
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (v: number) => v * Math.PI / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // làm tròn 1 chữ số thập phân
  }

  openDirections(): void {
    if (!this.station?.latitude || !this.station?.longitude) return;
    let url = `https://www.google.com/maps/dir/?api=1&destination=${this.station.latitude},${this.station.longitude}`;
    if (this.userLocation) {
      url += `&origin=${this.userLocation.lat},${this.userLocation.lng}`;
    }
    window.open(url, '_blank');
  }

  private _loadReviews(): void {
    if (!this._stationId) return;
    this.loadingReviews = true;
    this.reviewService.getReviews(this._stationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.reviews = res.data;
          this.loadingReviews = false;
        },
        error: () => {
          this.loadingReviews = false;
        }
      });
  }
}
