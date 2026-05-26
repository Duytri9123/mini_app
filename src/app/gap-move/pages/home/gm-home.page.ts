import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { map, Observable } from 'rxjs';
import { GmBanner } from '../../core/interfaces/banner.interface';
import { GmBooking, GmBookingType } from '../../core/interfaces/booking.interface';
import { GmCoordinate } from '../../core/interfaces/location.interface';
import { GmVehicleType } from '../../core/interfaces/vehicle.interface';
import { GmBannerService } from '../../core/services/gm-banner.service';
import { GmBookingService } from '../../core/services/gm-booking.service';
import { GmArticle, GmArticleService } from '../../core/services/gm-article.service';
import { GmAddressSearchResult, GmGeocodingService } from '../../core/services/gm-geocoding.service';
import { GM_SERVICE_OPTIONS, GmServiceOption } from '../../core/constants/gm-services.constants';
import { GmBannerCarouselComponent } from '../../shared/components/gm-banner-carousel/gm-banner-carousel.component';
import { GmBookingCardComponent } from '../../shared/components/gm-booking-card/gm-booking-card.component';
import { GmMapComponent } from '../../shared/components/gm-map/gm-map.component';

type GmHomeMode = 'delivery' | 'ride';

interface GmHomeModeOption {
  id: GmHomeMode;
  label: string;
  badge?: string;
}

interface GmHomeVehicleOption {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  artClass: string;
  imageUrl?: string;
  bookingType: GmBookingType;
  vehicleType: GmVehicleType;
  showMore?: boolean;
}

@Component({
  selector: 'app-gm-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonicModule, GmBannerCarouselComponent, GmBookingCardComponent, GmMapComponent],
  templateUrl: './gm-home.page.html',
  styleUrls: ['./gm-home.page.scss'],
})
export class GmHomePage implements OnInit, OnDestroy {
  banners$!: Observable<GmBanner[]>;
  activeBookings$!: Observable<GmBooking[]>;
  articles$!: Observable<GmArticle[]>;

  services = GM_SERVICE_OPTIONS;
  mobileModes: GmHomeModeOption[] = [
    { id: 'delivery', label: 'Giao hàng' },
    { id: 'ride', label: 'Đặt xe' },
  ];
  activeMobileMode: GmHomeMode = 'delivery';
  mobileVehicles: Record<GmHomeMode, GmHomeVehicleOption[]> = {
    delivery: [
      {
        id: 'delivery-bike',
        title: 'Xe Máy',
        icon: 'bicycle-outline',
        artClass: 'gm-mobile-vehicle-art-bike',
        imageUrl: 'assets/icon/xemay.png',
        bookingType: 'delivery',
        vehicleType: 'motorbike',
      },
      {
        id: 'delivery-bike-rack',
        title: 'Xe Máy có Baga / Cáng',
        icon: 'cube-outline',
        artClass: 'gm-mobile-vehicle-art-bike',
        imageUrl: 'assets/icon/xebaga.png',
        bookingType: 'delivery',
        vehicleType: 'motorbike',
      },
      {
        id: 'delivery-van-500',
        title: 'Xe Van 500 kg',
        icon: 'bus-outline',
        artClass: 'gm-mobile-vehicle-art-van',
        imageUrl: 'assets/icon/Van.png',
        bookingType: 'truck',
        vehicleType: 'van',
      },
      {
        id: 'delivery-van-750',
        title: 'Xe Van 750 kg',
        icon: 'bus-outline',
        artClass: 'gm-mobile-vehicle-art-van',
        imageUrl: 'assets/icon/Van.png',
        bookingType: 'truck',
        vehicleType: 'van',
      },
      {
        id: 'delivery-van-1000',
        title: 'Xe Van 1000 kg',
        icon: 'bus-outline',
        artClass: 'gm-mobile-vehicle-art-van',
        imageUrl: 'assets/icon/Van.png',
        bookingType: 'truck',
        vehicleType: 'truck',
      },
      {
        id: 'delivery-pickup',
        title: 'Xe Bán Tải',
        icon: 'car-outline',
        artClass: 'gm-mobile-vehicle-art-truck',
        imageUrl: 'assets/icon/pickup_truck.png',
        bookingType: 'truck',
        vehicleType: 'truck',
      },
      {
        id: 'delivery-truck-500',
        title: 'Xe Tải 500 kg',
        icon: 'cube-outline',
        artClass: 'gm-mobile-vehicle-art-box-truck',
        imageUrl: 'assets/icon/truck.png',
        bookingType: 'truck',
        vehicleType: 'truck',
      },
      {
        id: 'delivery-truck-750',
        title: 'Xe Tải 750 kg',
        icon: 'cube-outline',
        artClass: 'gm-mobile-vehicle-art-box-truck',
        imageUrl: 'assets/icon/truck.png',
        bookingType: 'truck',
        vehicleType: 'truck',
      },
      {
        id: 'delivery-truck-1000',
        title: 'Xe Tải 1000 kg',
        icon: 'cube-outline',
        artClass: 'gm-mobile-vehicle-art-box-truck',
        imageUrl: 'assets/icon/truck.png',
        bookingType: 'truck',
        vehicleType: 'truck',
      },
      {
        id: 'delivery-truck-1250',
        title: 'Xe Tải 1250 kg',
        icon: 'cube-outline',
        artClass: 'gm-mobile-vehicle-art-box-truck',
        imageUrl: 'assets/icon/truck.png',
        bookingType: 'truck',
        vehicleType: 'truck',
      },
    ],
    ride: [
      {
        id: 'ride-bike',
        title: 'Xe Máy',
        subtitle: 'Di chuyển nhanh trong thành phố',
        icon: 'bicycle-outline',
        artClass: 'gm-mobile-vehicle-art-bike',
        bookingType: 'ride',
        vehicleType: 'motorbike',
      },
      {
        id: 'ride-car',
        title: 'Ô tô 4 chỗ',
        subtitle: 'Đi nhóm nhỏ, có hành lý gọn',
        icon: 'car-outline',
        artClass: 'gm-mobile-vehicle-art-car',
        bookingType: 'ride',
        vehicleType: 'car',
      },
      {
        id: 'ride-car-7',
        title: 'Ô tô 7 chỗ',
        subtitle: 'Gia đình hoặc nhóm đông hơn',
        icon: 'car-sport-outline',
        artClass: 'gm-mobile-vehicle-art-car',
        bookingType: 'ride',
        vehicleType: 'car',
      },
    ],
  };
  desktopStats = [
    { value: 'Giao hàng', label: 'dịch vụ chính' },
    { value: '24/7', label: 'đặt đơn nhanh' },
    { value: '20', label: 'điểm dừng/đơn' },
    { value: 'Bản đồ', label: 'chọn điểm trực tiếp' },
  ];
  customerSegments = [
    {
      title: 'Khách cá nhân',
      description: 'Đặt xe, giao tài liệu, gửi hàng trong nội thành và đặt lịch trước khi cần.',
      icon: 'person-outline',
    },
    {
      title: 'Shop online',
      description: 'Giao nhiều điểm, thu hộ COD, ghi chú hàng hóa và theo dõi trạng thái đơn.',
      icon: 'storefront-outline',
    },
    {
      title: 'Doanh nghiệp',
      description: 'Tạo đơn nhanh cho đội vận hành, quản lý chi phí, mã ưu đãi và lịch sử thanh toán.',
      icon: 'business-outline',
    },
    {
      title: 'Cần bê hộ hàng',
      description: 'Thuê người bê hàng độc lập hoặc đi kèm chuyến xe, tính phí theo tầng và độ cồng kềnh.',
      icon: 'barbell-outline',
    },
  ];
  operationSteps = [
    'Nhập điểm lấy và điểm giao',
    'Chọn gói giao hàng, loại xe và dịch vụ thêm',
    'Xem tạm tính, thanh toán hoặc áp mã ưu đãi',
    'Theo dõi tài xế và trạng thái đơn',
  ];
  platformHighlights = [
    'Gợi ý địa chỉ từ VietMap và chọn điểm trực tiếp trên bản đồ.',
    'Hỗ trợ giao hàng nhanh, xe tải, chuyển nhà mini và bê hộ hàng.',
    'Thiết kế desktop cho vận hành, mobile cho trải nghiệm app.',
  ];
  pickupAddress = 'Đang lấy địa chỉ hiện tại...';
  dropoffAddress = '';
  pickupCoordinate?: GmCoordinate;
  dropoffCoordinate?: GmCoordinate;
  pickupSuggestions: GmAddressSearchResult[] = [];
  dropoffSuggestions: GmAddressSearchResult[] = [];
  activeAddressField: 'pickup' | 'dropoff' = 'pickup';
  isMapPickerOpen = false;
  isLocating = false;
  typedQuickTitle = '';
  mapSearchQuery = '';
  mapSearchResults: GmAddressSearchResult[] = [];
  pendingMapSelection?: GmAddressSearchResult;

  private pickupSearchTimer?: ReturnType<typeof setTimeout>;
  private dropoffSearchTimer?: ReturnType<typeof setTimeout>;
  private mapSearchTimer?: ReturnType<typeof setTimeout>;
  private titleTypingTimer?: ReturnType<typeof setTimeout>;
  private titlePhraseIndex = 0;
  private titleCharIndex = 0;
  private isTitleDeleting = false;
  private readonly quickTitlePhrases = ['Bạn muốn giao hàng đến đâu?', 'Bạn muốn tới đâu?'];

  constructor(
    private bannerService: GmBannerService,
    private bookingService: GmBookingService,
    private articleService: GmArticleService,
    private geocodingService: GmGeocodingService,
    private router: Router,
  ) {}

  get activeMobileVehicles(): GmHomeVehicleOption[] {
    return this.mobileVehicles[this.activeMobileMode];
  }

  ngOnInit(): void {
    this.banners$ = this.bannerService.getBanners();
    this.activeBookings$ = this.bookingService.getBookings().pipe(
      map((items) => items.filter((item) => item.status !== 'completed' && item.status !== 'cancelled').slice(0, 2)),
    );
    this.articles$ = this.articleService.getArticles().pipe(map((items) => items.slice(0, 3)));
    this.useCurrentLocation();
    this.startTitleTyping();
  }

  ngOnDestroy(): void {
    clearTimeout(this.titleTypingTimer);
    clearTimeout(this.pickupSearchTimer);
    clearTimeout(this.dropoffSearchTimer);
    clearTimeout(this.mapSearchTimer);
  }

  selectService(service: GmServiceOption): void {
    this.selectServiceById(service.id);
  }

  selectServiceById(serviceId: GmBookingType): void {
    const queryParams = this.buildAddressQuery(serviceId);
    if (serviceId === 'multi_stop') {
      this.router.navigate(['/gap-move/multi-stop'], { queryParams });
      return;
    }
    if (serviceId === 'porter') {
      this.router.navigate(['/gap-move/carry'], { queryParams });
      return;
    }
    if (serviceId === 'truck') {
      this.router.navigate(['/gap-move/truck'], { queryParams });
      return;
    }
    if (serviceId === 'moving') {
      this.router.navigate(['/gap-move/moving'], { queryParams });
      return;
    }
    this.router.navigate(['/gap-move/booking/new'], { queryParams });
  }

  setMobileMode(mode: GmHomeMode): void {
    this.activeMobileMode = mode;
  }

  selectMobileVehicle(vehicle: GmHomeVehicleOption): void {
    this.router.navigate(['/gap-move/booking/new'], {
      queryParams: {
        ...this.buildAddressQuery(vehicle.bookingType),
        vehicleType: vehicle.vehicleType,
      },
    });
  }

  startQuickBooking(): void {
    this.router.navigate(['/gap-move/booking/new'], { queryParams: this.buildAddressQuery('delivery') });
  }

  openBooking(booking: GmBooking): void {
    this.router.navigate(['/gap-move/booking', booking.id]);
  }

  goToMap(): void {
    this.openMapPicker('dropoff');
  }

  get mapPickerPickup(): GmCoordinate | undefined {
    if (this.activeAddressField === 'pickup' && this.pendingMapSelection) {
      return this.pendingMapSelection.coordinate;
    }
    return this.pickupCoordinate;
  }

  get mapPickerDropoff(): GmCoordinate | undefined {
    if (this.activeAddressField === 'dropoff' && this.pendingMapSelection) {
      return this.pendingMapSelection.coordinate;
    }
    return this.dropoffCoordinate;
  }

  get pendingMapAddress(): string {
    return this.pendingMapSelection?.address ?? 'Chạm bản đồ, tìm địa chỉ hoặc dùng vị trí hiện tại';
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.pickupAddress = 'Nhập điểm lấy hoặc chọn trên bản đồ';
      return;
    }

    this.isLocating = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinate: GmCoordinate = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: 'Đang xác định địa chỉ hiện tại...',
        };
        this.applyPickup({ address: coordinate.address ?? 'Đang xác định địa chỉ hiện tại...', coordinate });
        this.geocodingService.reverseGeocode(coordinate.lat, coordinate.lng).subscribe((result) => {
          this.isLocating = false;
          if (result) {
            this.applyPickup(result);
            return;
          }
          const fallbackAddress = 'Chưa xác định được địa chỉ hiện tại';
          this.applyPickup({ address: fallbackAddress, coordinate: { ...coordinate, address: fallbackAddress } });
        });
      },
      () => {
        this.isLocating = false;
        this.pickupAddress = 'Nhập điểm lấy hoặc chọn trên bản đồ';
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 },
    );
  }

  onAddressInput(field: 'pickup' | 'dropoff'): void {
    const query = field === 'pickup' ? this.pickupAddress : this.dropoffAddress;
    if (field === 'pickup') {
      clearTimeout(this.pickupSearchTimer);
      this.pickupSearchTimer = setTimeout(() => this.searchAddress(field, query), 250);
      return;
    }

    clearTimeout(this.dropoffSearchTimer);
    this.dropoffSearchTimer = setTimeout(() => this.searchAddress(field, query), 250);
  }

  useSuggestion(field: 'pickup' | 'dropoff', result: GmAddressSearchResult): void {
    if (field === 'pickup') {
      this.applyPickup(result);
      this.pickupSuggestions = [];
      return;
    }

    this.applyDropoff(result);
    this.dropoffSuggestions = [];
  }

  openMapPicker(field: 'pickup' | 'dropoff'): void {
    this.activeAddressField = field;
    const currentCoordinate = field === 'pickup' ? this.pickupCoordinate : this.dropoffCoordinate;
    const currentAddress = field === 'pickup' ? this.pickupAddress : this.dropoffAddress;
    this.pendingMapSelection = currentCoordinate
      ? { address: currentAddress || currentCoordinate.address || 'Vị trí đã chọn', coordinate: currentCoordinate }
      : undefined;
    this.mapSearchQuery = currentAddress;
    this.mapSearchResults = [];
    this.isMapPickerOpen = true;
  }

  closeMapPicker(): void {
    this.isMapPickerOpen = false;
    this.mapSearchResults = [];
    this.pendingMapSelection = undefined;
  }

  useMapCoordinate(coordinate: GmCoordinate): void {
    const fallback: GmAddressSearchResult = {
      address: coordinate.address || 'Vị trí đã chọn trên bản đồ',
      coordinate,
    };

    this.pendingMapSelection = fallback;
    this.mapSearchQuery = fallback.address;

    this.geocodingService.reverseGeocode(coordinate.lat, coordinate.lng).subscribe((result) => {
      if (!result) {
        return;
      }
      this.pendingMapSelection = result;
      this.mapSearchQuery = result.address;
    });
  }

  onMapSearchInput(): void {
    clearTimeout(this.mapSearchTimer);
    if (this.mapSearchQuery.trim().length < 2) {
      this.mapSearchResults = [];
      return;
    }

    this.mapSearchTimer = setTimeout(() => {
      this.geocodingService.searchAddress(this.mapSearchQuery).subscribe((results) => {
        this.mapSearchResults = results.slice(0, 5);
      });
    }, 250);
  }

  useMapSearchResult(result: GmAddressSearchResult): void {
    this.pendingMapSelection = result;
    this.mapSearchQuery = result.address;
    this.mapSearchResults = [];
  }

  locateMapPicker(): void {
    if (!navigator.geolocation) {
      return;
    }

    this.isLocating = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinate: GmCoordinate = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: 'Đang xác định địa chỉ hiện tại...',
        };
        this.pendingMapSelection = { address: coordinate.address ?? 'Đang xác định địa chỉ hiện tại...', coordinate };
        this.mapSearchQuery = this.pendingMapSelection.address;
        this.geocodingService.reverseGeocode(coordinate.lat, coordinate.lng).subscribe((result) => {
          this.isLocating = false;
          if (result) {
            this.pendingMapSelection = result;
            this.mapSearchQuery = result.address;
          }
        });
      },
      () => {
        this.isLocating = false;
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 },
    );
  }

  confirmMapSelection(): void {
    if (!this.pendingMapSelection) {
      return;
    }

    if (this.activeAddressField === 'pickup') {
      this.applyPickup(this.pendingMapSelection);
    } else {
      this.applyDropoff(this.pendingMapSelection);
    }

    this.closeMapPicker();
  }

  iconClass(service: GmServiceOption): string {
    const mapClasses: Record<GmServiceOption['accent'], string> = {
      teal: 'bg-[#008c95]',
      orange: 'bg-[#ff5a00]',
      slate: 'bg-slate-900',
      green: 'bg-emerald-600',
    };
    return mapClasses[service.accent];
  }

  private buildAddressQuery(type: GmBookingType): Record<string, string> {
    const queryParams: Record<string, string> = { type };
    if (this.pickupAddress.trim()) {
      queryParams['pickup'] = this.pickupAddress.trim();
    }
    if (this.pickupCoordinate) {
      queryParams['pickupLat'] = String(this.pickupCoordinate.lat);
      queryParams['pickupLng'] = String(this.pickupCoordinate.lng);
    }
    if (this.dropoffAddress.trim()) {
      queryParams['dropoff'] = this.dropoffAddress.trim();
    }
    if (this.dropoffCoordinate) {
      queryParams['dropoffLat'] = String(this.dropoffCoordinate.lat);
      queryParams['dropoffLng'] = String(this.dropoffCoordinate.lng);
    }
    return queryParams;
  }

  private searchAddress(field: 'pickup' | 'dropoff', query: string): void {
    if (query.trim().length < 2) {
      if (field === 'pickup') {
        this.pickupSuggestions = [];
      } else {
        this.dropoffSuggestions = [];
      }
      return;
    }

    this.geocodingService.searchAddress(query).subscribe((results) => {
      if (field === 'pickup') {
        this.pickupSuggestions = results.slice(0, 4);
        return;
      }
      this.dropoffSuggestions = results.slice(0, 4);
    });
  }

  private applyPickup(result: GmAddressSearchResult): void {
    this.pickupAddress = result.address;
    this.pickupCoordinate = result.coordinate;
  }

  private applyDropoff(result: GmAddressSearchResult): void {
    this.dropoffAddress = result.address;
    this.dropoffCoordinate = result.coordinate;
  }

  private startTitleTyping(): void {
    const phrase = this.quickTitlePhrases[this.titlePhraseIndex];
    this.titleCharIndex += this.isTitleDeleting ? -1 : 1;
    this.typedQuickTitle = phrase.slice(0, this.titleCharIndex);

    let delay = this.isTitleDeleting ? 34 : 58;
    if (!this.isTitleDeleting && this.titleCharIndex === phrase.length) {
      delay = 1200;
      this.isTitleDeleting = true;
    } else if (this.isTitleDeleting && this.titleCharIndex === 0) {
      this.titlePhraseIndex = (this.titlePhraseIndex + 1) % this.quickTitlePhrases.length;
      this.isTitleDeleting = false;
      delay = 260;
    }

    this.titleTypingTimer = setTimeout(() => this.startTitleTyping(), delay);
  }
}
