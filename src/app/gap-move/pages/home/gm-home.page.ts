import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { map, Observable, Subscription } from 'rxjs';
import { GmBanner } from '../../core/interfaces/banner.interface';
import { GmBooking, GmBookingType } from '../../core/interfaces/booking.interface';
import { GmCoordinate, GmCustomerAddress } from '../../core/interfaces/location.interface';
import { GmVehicleType } from '../../core/interfaces/vehicle.interface';
import { GmBannerService } from '../../core/services/gm-banner.service';
import { GmBookingService } from '../../core/services/gm-booking.service';
import { GmArticle, GmArticleService } from '../../core/services/gm-article.service';
import { GmAddressSearchResult, GmGeocodingService } from '../../core/services/gm-geocoding.service';
import { GmCustomerAddressService } from '../../core/services/gm-customer-address.service';
import { GM_SERVICE_OPTIONS, GmServiceOption } from '../../core/constants/gm-services.constants';
import { formatVnd } from '../../core/utils/helpers';
import { GmBannerCarouselComponent } from '../../shared/components/gm-banner-carousel/gm-banner-carousel.component';
import { GmBookingCardComponent } from '../../shared/components/gm-booking-card/gm-booking-card.component';
import { GmMapComponent, GmMapMarkerDragEvent } from '../../shared/components/gm-map/gm-map.component';

type GmHomeMode = 'delivery' | 'ride';
type GmHomeAddressField = 'pickup' | 'dropoff' | 'stop';

interface GmHomeModeOption {
  id: GmHomeMode;
  label: string;
  badge?: string;
}

interface GmHomeVehicleOption {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon: string;
  artClass: string;
  imageUrl?: string;
  bookingType: GmBookingType;
  vehicleType: GmVehicleType;
  dimensions?: string;
  maxWeightKg?: number;
  priceBase?: number;
  showMore?: boolean;
}

interface GmHomeAddressDetails {
  unit: string;
  phone: string;
  contactName: string;
  saveAddress: boolean;
}

interface GmHomeDeliveryPackage {
  id: 'express' | 'standard' | 'saving';
  title: string;
  subtitle: string;
  priceMultiplier: number;
}

interface GmHomeRoutePointState {
  address: string;
  coordinate?: GmCoordinate;
  details: GmHomeAddressDetails;
  suggestions: GmAddressSearchResult[];
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
  selectedMobileVehicleId = 'delivery-bike-rack';
  expandedVehicleInfoId = 'delivery-bike-rack';
  selectedDeliveryPackageId: GmHomeDeliveryPackage['id'] = 'standard';
  isRouteReorderMode = false;
  deliveryPackages: GmHomeDeliveryPackage[] = [
    {
      id: 'express',
      title: 'Siêu Tốc',
      subtitle: 'Lấy hàng và giao nhanh cho đơn gấp',
      priceMultiplier: 1.16,
    },
    {
      id: 'standard',
      title: 'Tiêu Chuẩn',
      subtitle: 'Cân bằng tốc độ và chi phí',
      priceMultiplier: 1,
    },
    {
      id: 'saving',
      title: 'Tiết Kiệm',
      subtitle: 'Giá tốt cho đơn chưa cần giao gấp',
      priceMultiplier: 0.91,
    },
  ];
  mobileVehicles: Record<GmHomeMode, GmHomeVehicleOption[]> = {
    delivery: [
      {
        id: 'delivery-bike',
        title: 'Xe Máy',
        subtitle: 'Giao nhanh tài liệu và hàng nhỏ',
        description: 'Phù hợp đơn gọn, cần tài xế đến nhanh trong nội thành.',
        icon: 'bicycle-outline',
        artClass: 'gm-mobile-vehicle-art-bike',
        imageUrl: 'assets/icon/xemay.png',
        bookingType: 'delivery',
        vehicleType: 'motorbike',
        dimensions: '50 x 50 x 50 cm',
        maxWeightKg: 30,
        priceBase: 72000,
      },
      {
        id: 'delivery-bike-rack',
        title: 'Xe Máy có Baga / Cáng',
        subtitle: 'Chở hàng dài hoặc nhiều kiện hơn',
        description: 'Có baga/cáng hỗ trợ hàng cồng kềnh vừa, vẫn giữ tốc độ xe máy.',
        icon: 'cube-outline',
        artClass: 'gm-mobile-vehicle-art-bike',
        imageUrl: 'assets/icon/xebaga.png',
        bookingType: 'delivery',
        vehicleType: 'motorbike',
        dimensions: '60 x 60 x 80 cm',
        maxWeightKg: 50,
        priceBase: 78840,
      },
      {
        id: 'delivery-van-500',
        title: 'Xe Van 500 kg',
        subtitle: 'Hàng trung bình, cần khoang kín',
        description: 'Dành cho thùng carton, thiết bị và hàng cần che mưa nắng.',
        icon: 'bus-outline',
        artClass: 'gm-mobile-vehicle-art-van',
        imageUrl: 'assets/icon/Van.png',
        bookingType: 'truck',
        vehicleType: 'van',
        dimensions: '1.7 x 1.2 x 1.2 m',
        maxWeightKg: 500,
        priceBase: 158000,
      },
      {
        id: 'delivery-van-750',
        title: 'Xe Van 750 kg',
        subtitle: 'Nhiều kiện hàng hơn xe van 500 kg',
        description: 'Phù hợp shop online, thiết bị và hàng cần khoang kín lớn hơn.',
        icon: 'bus-outline',
        artClass: 'gm-mobile-vehicle-art-van',
        imageUrl: 'assets/icon/Van.png',
        bookingType: 'truck',
        vehicleType: 'van',
        dimensions: '2.1 x 1.35 x 1.25 m',
        maxWeightKg: 750,
        priceBase: 186000,
      },
      {
        id: 'delivery-van-1000',
        title: 'Xe Van 1000 kg',
        subtitle: 'Hàng lớn, vẫn cần khoang kín',
        description: 'Tối ưu cho hàng cồng kềnh vừa và nhiều điểm giao trong ngày.',
        icon: 'bus-outline',
        artClass: 'gm-mobile-vehicle-art-van',
        imageUrl: 'assets/icon/Van.png',
        bookingType: 'truck',
        vehicleType: 'truck',
        dimensions: '2.4 x 1.45 x 1.35 m',
        maxWeightKg: 1000,
        priceBase: 214000,
      },
      {
        id: 'delivery-pickup',
        title: 'Xe Bán Tải',
        subtitle: 'Gọn cho hàng nặng vừa',
        description: 'Phù hợp hàng cần thùng xe thoáng, bốc dỡ nhanh.',
        icon: 'car-outline',
        artClass: 'gm-mobile-vehicle-art-truck',
        imageUrl: 'assets/icon/pickup_truck.png',
        bookingType: 'truck',
        vehicleType: 'truck',
        dimensions: '1.5 x 1.4 x 0.5 m',
        maxWeightKg: 750,
        priceBase: 198000,
      },
      {
        id: 'delivery-truck-500',
        title: 'Xe Tải 500 kg',
        subtitle: 'Hàng cồng kềnh nội thành',
        description: 'Dành cho hàng thùng, nội thất nhỏ và đơn cần thùng tải.',
        icon: 'cube-outline',
        artClass: 'gm-mobile-vehicle-art-box-truck',
        imageUrl: 'assets/icon/truck.png',
        bookingType: 'truck',
        vehicleType: 'truck',
        dimensions: '2.0 x 1.4 x 1.4 m',
        maxWeightKg: 500,
        priceBase: 205000,
      },
      {
        id: 'delivery-truck-750',
        title: 'Xe Tải 750 kg',
        subtitle: 'Nhiều hàng hơn xe tải 500 kg',
        description: 'Phù hợp hàng doanh nghiệp, vật tư và nhiều kiện lớn.',
        icon: 'cube-outline',
        artClass: 'gm-mobile-vehicle-art-box-truck',
        imageUrl: 'assets/icon/truck.png',
        bookingType: 'truck',
        vehicleType: 'truck',
        dimensions: '2.4 x 1.5 x 1.5 m',
        maxWeightKg: 750,
        priceBase: 232000,
      },
      {
        id: 'delivery-truck-1000',
        title: 'Xe Tải 1000 kg',
        subtitle: 'Hàng lớn hoặc chuyển phòng nhỏ',
        description: 'Tối ưu khi đơn cần tải trọng lớn và thùng xe rộng.',
        icon: 'cube-outline',
        artClass: 'gm-mobile-vehicle-art-box-truck',
        imageUrl: 'assets/icon/truck.png',
        bookingType: 'truck',
        vehicleType: 'truck',
        dimensions: '3.0 x 1.6 x 1.6 m',
        maxWeightKg: 1000,
        priceBase: 265000,
      },
      {
        id: 'delivery-truck-1250',
        title: 'Xe Tải 1250 kg',
        subtitle: 'Tải trọng lớn cho hàng nhiều kiện',
        description: 'Dành cho đơn lớn, hàng kho và chuyển văn phòng nhỏ.',
        icon: 'cube-outline',
        artClass: 'gm-mobile-vehicle-art-box-truck',
        imageUrl: 'assets/icon/truck.png',
        bookingType: 'truck',
        vehicleType: 'truck',
        dimensions: '3.2 x 1.7 x 1.7 m',
        maxWeightKg: 1250,
        priceBase: 292000,
      },
    ],
    ride: [
      {
        id: 'ride-bike',
        title: 'Xe Máy',
        subtitle: 'Di chuyển nhanh trong thành phố',
        description: 'Tối ưu cho một hành khách và quãng đường nội thành.',
        icon: 'bicycle-outline',
        artClass: 'gm-mobile-vehicle-art-bike',
        imageUrl: 'assets/icon/drive-gap.png',
        bookingType: 'ride',
        vehicleType: 'motorbike',
        priceBase: 42000,
      },
      {
        id: 'ride-car',
        title: 'Ô tô 4 chỗ',
        subtitle: 'Đi nhóm nhỏ, có hành lý gọn',
        description: 'Phù hợp nhóm nhỏ, đi làm, đi sân bay hoặc khi cần che mưa nắng.',
        icon: 'car-outline',
        artClass: 'gm-mobile-vehicle-art-car',
        imageUrl: 'assets/icon/car4.png',
        bookingType: 'ride',
        vehicleType: 'car',
        priceBase: 98000,
      },
      {
        id: 'ride-car-7',
        title: 'Ô tô 7 chỗ',
        subtitle: 'Gia đình hoặc nhóm đông hơn',
        description: 'Dành cho nhóm đông, có thêm hành lý hoặc cần không gian rộng.',
        icon: 'car-sport-outline',
        artClass: 'gm-mobile-vehicle-art-car',
        imageUrl: 'assets/icon/car7.png',
        bookingType: 'ride',
        vehicleType: 'car',
        priceBase: 128000,
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
  pickupDetails: GmHomeAddressDetails = this.createEmptyAddressDetails();
  dropoffDetails: GmHomeAddressDetails = this.createEmptyAddressDetails();
  stopAddresses: string[] = [];
  stopCoordinates: Array<GmCoordinate | undefined> = [];
  stopDetails: GmHomeAddressDetails[] = [];
  pickupSuggestions: GmAddressSearchResult[] = [];
  dropoffSuggestions: GmAddressSearchResult[] = [];
  stopSuggestions: GmAddressSearchResult[][] = [];
  activeAddressField: GmHomeAddressField = 'pickup';
  activeStopIndex: number | null = null;
  isMapPickerOpen = false;
  isAddressSearchOpen = false;
  isSavedAddressesOpen = false;
  isScheduleSheetOpen = false;
  isSchedulePickerOpen = false;
  isLocating = false;
  scheduleMode: 'now' | 'scheduled' = 'now';
  scheduledAt = '';
  addressSearchField: GmHomeAddressField = 'pickup';
  addressSearchStopIndex: number | null = null;
  addressSearchQuery = '';
  addressSearchResults: GmAddressSearchResult[] = [];
  savedAddresses: GmCustomerAddress[] = [];
  savedAddressesLoading = false;
  typedQuickTitle = '';
  mapSearchQuery = '';
  mapSearchResults: GmAddressSearchResult[] = [];
  pendingMapSelection?: GmAddressSearchResult;
  mapAddressDetails: GmHomeAddressDetails = this.createEmptyAddressDetails();

  private pickupSearchTimer?: ReturnType<typeof setTimeout>;
  private dropoffSearchTimer?: ReturnType<typeof setTimeout>;
  private stopSearchTimers: Array<ReturnType<typeof setTimeout> | undefined> = [];
  private addressSearchTimer?: ReturnType<typeof setTimeout>;
  private mapSearchTimer?: ReturnType<typeof setTimeout>;
  private routeDragIndex: number | null = null;
  private savedAddressSub?: Subscription;
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
    private customerAddressService: GmCustomerAddressService,
    private router: Router,
  ) {}

  get activeMobileVehicles(): GmHomeVehicleOption[] {
    return this.mobileVehicles[this.activeMobileMode];
  }

  get selectedMobileVehicle(): GmHomeVehicleOption {
    return (
      this.activeMobileVehicles.find((vehicle) => vehicle.id === this.selectedMobileVehicleId) ??
      this.activeMobileVehicles[0] ??
      this.mobileVehicles.delivery[0]!
    );
  }

  get selectedDeliveryPackage(): GmHomeDeliveryPackage {
    return this.deliveryPackages.find((item) => item.id === this.selectedDeliveryPackageId) ?? this.deliveryPackages[1]!;
  }

  get isRouteReadyForServices(): boolean {
    const hasDropoff = Boolean(this.dropoffAddress.trim() && this.dropoffCoordinate);
    const stopsReady = this.stopAddresses.every((address, index) => Boolean(address.trim() && this.stopCoordinates[index]));
    return hasDropoff && stopsReady;
  }

  get routeSwitchButtonLabel(): string {
    return this.stopAddresses.length ? 'Sắp xếp điểm dừng' : 'Đổi chiều điểm lấy và điểm giao';
  }

  get mapPickerStops(): GmCoordinate[] {
    if (this.activeAddressField !== 'stop' || this.activeStopIndex === null || !this.pendingMapSelection?.coordinate) {
      return this.routeStopCoordinates;
    }

    const pendingCoordinate = this.pendingMapSelection.coordinate;
    return this.mapPickerStopIndexes.map((index) =>
      index === this.activeStopIndex ? pendingCoordinate : this.stopCoordinates[index] ?? pendingCoordinate,
    );
  }

  get mapPickerStopIndexes(): number[] {
    const indexes = this.routeStopIndexes;
    if (this.activeAddressField === 'stop' && this.activeStopIndex !== null && !indexes.includes(this.activeStopIndex)) {
      return [...indexes, this.activeStopIndex];
    }
    return indexes;
  }

  get routeStopCoordinates(): GmCoordinate[] {
    return this.stopCoordinates.filter((coordinate): coordinate is GmCoordinate => Boolean(coordinate));
  }

  get routeStopIndexes(): number[] {
    return this.stopCoordinates
      .map((coordinate, index) => (coordinate ? index : null))
      .filter((index): index is number => index !== null);
  }

  ngOnInit(): void {
    this.banners$ = this.bannerService.getBanners();
    this.activeBookings$ = this.bookingService.getBookings().pipe(
      map((items) => items.filter((item) => item.status !== 'completed' && item.status !== 'cancelled').slice(0, 2)),
    );
    this.articles$ = this.articleService.getArticles().pipe(map((items) => items.slice(0, 3)));
    this.useCurrentLocation();
    this.loadSavedAddresses();
    this.startTitleTyping();
  }

  ngOnDestroy(): void {
    clearTimeout(this.titleTypingTimer);
    clearTimeout(this.pickupSearchTimer);
    clearTimeout(this.dropoffSearchTimer);
    this.stopSearchTimers.forEach((timer) => clearTimeout(timer));
    clearTimeout(this.addressSearchTimer);
    clearTimeout(this.mapSearchTimer);
    this.savedAddressSub?.unsubscribe();
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
    if (!this.activeMobileVehicles.some((vehicle) => vehicle.id === this.selectedMobileVehicleId)) {
      this.selectedMobileVehicleId = this.activeMobileVehicles[0]?.id ?? '';
      this.expandedVehicleInfoId = this.selectedMobileVehicleId;
    }
  }

  selectMobileVehicle(vehicle: GmHomeVehicleOption): void {
    this.selectedMobileVehicleId = vehicle.id;
    this.expandedVehicleInfoId = this.expandedVehicleInfoId === vehicle.id ? '' : vehicle.id;
  }

  continueWithMobileSelection(): void {
    const vehicle = this.selectedMobileVehicle;
    this.router.navigate(['/gap-move/booking/new'], {
      queryParams: {
        ...this.buildAddressQuery(vehicle.bookingType),
        vehicleType: vehicle.vehicleType,
        vehicleOption: vehicle.id,
        deliveryPackage: this.selectedDeliveryPackageId,
      },
    });
  }

  selectDeliveryPackage(packageOption: GmHomeDeliveryPackage): void {
    this.selectedDeliveryPackageId = packageOption.id;
  }

  formatDeliveryPackagePrice(packageOption: GmHomeDeliveryPackage): string {
    const stopSurcharge = this.stopAddresses.length * 12000;
    const base = this.selectedMobileVehicle.priceBase ?? 78000;
    return formatVnd(Math.round((base + stopSurcharge) * packageOption.priceMultiplier));
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
    if (this.activeAddressField === 'pickup' && this.pendingMapSelection?.coordinate) {
      return this.pendingMapSelection.coordinate;
    }
    return this.pickupCoordinate;
  }

  get mapPickerDropoff(): GmCoordinate | undefined {
    if (this.activeAddressField === 'dropoff' && this.pendingMapSelection?.coordinate) {
      return this.pendingMapSelection.coordinate;
    }
    return this.dropoffCoordinate;
  }

  get pendingMapAddress(): string {
    return this.pendingMapSelection?.address ?? 'Chạm bản đồ, tìm địa chỉ hoặc dùng vị trí hiện tại';
  }

  get mapDetailsRequired(): boolean {
    return this.activeMobileMode === 'delivery' && this.activeAddressField !== 'pickup';
  }

  get mapDetailsComplete(): boolean {
    if (!this.mapDetailsRequired) {
      return true;
    }

    return Boolean(
      this.mapAddressDetails.unit.trim() &&
        this.mapAddressDetails.phone.trim() &&
        this.mapAddressDetails.contactName.trim(),
    );
  }

  get addressSearchPlaceholder(): string {
    if (this.addressSearchField === 'pickup') {
      return 'Từ';
    }
    if (this.addressSearchField === 'dropoff') {
      return this.stopAddresses.length ? 'Điểm cuối' : 'Đến';
    }
    return 'Điểm dừng';
  }

  get addressSearchCurrentAddress(): string {
    return this.pickupAddress || 'Chọn vị trí hiện tại';
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
    this.geocodingService.resolveAddress(result).subscribe((resolved) => {
      this.confirmAddressSelectionWithMap(field, resolved);
      this.pickupSuggestions = [];
      this.dropoffSuggestions = [];
    });
  }

  confirmAddressSelectionWithMap(field: GmHomeAddressField, resolved: GmAddressSearchResult, stopIndex: number | null = null): void {
    this.closeAddressSearch();
    this.openMapPickerWithSelection(field, resolved, stopIndex);
  }

  openMapPickerWithSelection(field: GmHomeAddressField, selection: GmAddressSearchResult, stopIndex: number | null = null): void {
    this.activeAddressField = field;
    this.activeStopIndex = field === 'stop' ? stopIndex ?? this.activeStopIndex ?? 0 : null;
    this.pendingMapSelection = selection;
    this.mapSearchQuery = selection.address;
    this.mapSearchResults = [];
    this.mapAddressDetails = this.cloneAddressDetails(this.getAddressDetails(field, this.activeStopIndex));
    this.isMapPickerOpen = true;
  }

  openAddressSearch(field: GmHomeAddressField, stopIndex: number | null = null): void {
    this.addressSearchField = field;
    this.addressSearchStopIndex = stopIndex;
    this.addressSearchQuery =
      field === 'pickup'
        ? this.pickupAddress
        : field === 'dropoff'
          ? this.dropoffAddress
          : stopIndex !== null
            ? this.stopAddresses[stopIndex] ?? ''
            : '';
    this.addressSearchResults = [];
    this.isSavedAddressesOpen = false;
    this.isAddressSearchOpen = true;

    window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.gm-address-search-input');
      input?.focus();
      input?.select();
    }, 80);
  }

  closeAddressSearch(): void {
    this.isAddressSearchOpen = false;
    this.addressSearchResults = [];
    this.isSavedAddressesOpen = false;
    clearTimeout(this.addressSearchTimer);
  }

  chooseLocationOnMapFromSearch(): void {
    const field = this.addressSearchField;
    const stopIndex = this.addressSearchStopIndex;
    this.closeAddressSearch();
    this.openMapPicker(field, field === 'stop' ? stopIndex : null);
  }

  onAddressSearchInput(): void {
    clearTimeout(this.addressSearchTimer);
    if (this.addressSearchQuery.trim().length < 2) {
      this.addressSearchResults = [];
      return;
    }

    this.addressSearchTimer = setTimeout(() => {
      this.geocodingService.searchAddress(this.addressSearchQuery).subscribe((results) => {
        this.addressSearchResults = results.slice(0, 8);
      });
    }, 250);
  }

  useCurrentAddressForSearch(): void {
    const coordinate = this.pickupCoordinate;
    if (!coordinate) {
      this.useCurrentLocation();
      return;
    }

    const resolved = {
      address: this.pickupAddress || coordinate.address || 'Vị trí hiện tại',
      coordinate,
    };
    const field = this.addressSearchField;
    this.confirmAddressSelectionWithMap(field, resolved, field === 'stop' ? this.addressSearchStopIndex : null);
  }

  useAddressSearchResult(result: GmAddressSearchResult): void {
    this.geocodingService.resolveAddress(result).subscribe((resolved) => {
      const field = this.addressSearchField;
      this.confirmAddressSelectionWithMap(field, resolved, field === 'stop' ? this.addressSearchStopIndex : null);
    });
  }

  toggleSavedAddresses(): void {
    this.isSavedAddressesOpen = !this.isSavedAddressesOpen;
    if (this.isSavedAddressesOpen && !this.savedAddresses.length && !this.savedAddressesLoading) {
      this.loadSavedAddresses();
    }
  }

  useSavedAddress(address: GmCustomerAddress): void {
    const resolved: GmAddressSearchResult = {
      address: address.address,
      coordinate: this.customerAddressService.toCoordinate(address),
    };
    const field = this.addressSearchField;
    this.confirmAddressSelectionWithMap(field, resolved, field === 'stop' ? this.addressSearchStopIndex : null);
  }

  addStop(): void {
    this.stopAddresses = [...this.stopAddresses, ''];
    this.stopCoordinates = [...this.stopCoordinates, undefined];
    this.stopDetails = [...this.stopDetails, this.createEmptyAddressDetails()];
    this.stopSuggestions = [...this.stopSuggestions, []];
  }

  removeStop(index: number): void {
    clearTimeout(this.stopSearchTimers[index]);
    this.stopAddresses = this.stopAddresses.filter((_, itemIndex) => itemIndex !== index);
    this.stopCoordinates = this.stopCoordinates.filter((_, itemIndex) => itemIndex !== index);
    this.stopDetails = this.stopDetails.filter((_, itemIndex) => itemIndex !== index);
    this.stopSuggestions = this.stopSuggestions.filter((_, itemIndex) => itemIndex !== index);
    this.stopSearchTimers = this.stopSearchTimers.filter((_, itemIndex) => itemIndex !== index);
    if (!this.stopAddresses.length) {
      this.isRouteReorderMode = false;
    }
  }

  toggleRouteSwitchMode(): void {
    if (!this.stopAddresses.length) {
      this.swapPickupDropoff();
      return;
    }

    this.isRouteReorderMode = !this.isRouteReorderMode;
  }

  moveDestinationPoint(fromIndex: number, toIndex: number): void {
    const points = this.getDestinationPointStates();
    if (!points.length || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= points.length || toIndex >= points.length) {
      return;
    }

    const [movedPoint] = points.splice(fromIndex, 1);
    points.splice(toIndex, 0, movedPoint);
    this.applyDestinationPointStates(points);
  }

  moveStopUp(index: number): void {
    this.moveDestinationPoint(index, Math.max(0, index - 1));
  }

  moveStopDown(index: number): void {
    this.moveDestinationPoint(index, Math.min(this.stopAddresses.length, index + 1));
  }

  startRouteDrag(index: number): void {
    if (!this.isRouteReorderMode) {
      return;
    }

    this.routeDragIndex = index;
  }

  allowRouteDrop(event: DragEvent): void {
    if (!this.isRouteReorderMode) {
      return;
    }

    event.preventDefault();
  }

  dropRoutePoint(index: number, event: DragEvent): void {
    if (!this.isRouteReorderMode || this.routeDragIndex === null) {
      return;
    }

    event.preventDefault();
    this.moveDestinationPoint(this.routeDragIndex, index);
    this.routeDragIndex = null;
  }

  endRouteDrag(): void {
    this.routeDragIndex = null;
  }

  onStopAddressInput(index: number): void {
    const query = this.stopAddresses[index] ?? '';
    clearTimeout(this.stopSearchTimers[index]);
    this.stopSearchTimers[index] = setTimeout(() => this.searchStopAddress(index, query), 250);
  }

  useStopSuggestion(index: number, result: GmAddressSearchResult): void {
    this.geocodingService.resolveAddress(result).subscribe((resolved) => {
      this.confirmAddressSelectionWithMap('stop', resolved, index);
      this.stopSuggestions[index] = [];
    });
  }

  openScheduleSheet(): void {
    if (!this.scheduledAt) {
      this.scheduledAt = this.toDateTimeLocal(new Date(Date.now() + 30 * 60 * 1000));
    }
    this.isSchedulePickerOpen = this.scheduleMode === 'scheduled';
    this.isScheduleSheetOpen = true;
  }

  closeScheduleSheet(): void {
    this.isScheduleSheetOpen = false;
    this.isSchedulePickerOpen = false;
  }

  selectScheduleNow(): void {
    this.scheduleMode = 'now';
    this.scheduledAt = '';
    this.closeScheduleSheet();
  }

  showSchedulePicker(): void {
    this.scheduleMode = 'scheduled';
    if (!this.scheduledAt) {
      this.scheduledAt = this.toDateTimeLocal(new Date(Date.now() + 30 * 60 * 1000));
    }
    this.isSchedulePickerOpen = true;
  }

  confirmScheduledPickup(): void {
    this.scheduleMode = 'scheduled';
    if (!this.scheduledAt) {
      this.scheduledAt = this.toDateTimeLocal(new Date(Date.now() + 30 * 60 * 1000));
    }
    this.closeScheduleSheet();
  }

  get scheduleButtonLabel(): string {
    if (this.scheduleMode !== 'scheduled' || !this.scheduledAt) {
      return 'Đặt ngay';
    }

    return this.formatScheduleLabel(this.scheduledAt);
  }

  get minScheduleDateTime(): string {
    return this.toDateTimeLocal(new Date(Date.now() + 15 * 60 * 1000));
  }

  openMapPicker(field: GmHomeAddressField, stopIndex: number | null = null): void {
    this.activeAddressField = field;
    this.activeStopIndex = field === 'stop' ? stopIndex ?? this.activeStopIndex ?? 0 : null;
    const currentCoordinate = this.getCurrentCoordinate(field, this.activeStopIndex);
    const currentAddress = this.getCurrentAddress(field, this.activeStopIndex);
    this.pendingMapSelection = currentCoordinate
      ? { address: currentAddress || currentCoordinate.address || 'Vị trí đã chọn', coordinate: currentCoordinate }
      : undefined;
    this.mapSearchQuery = currentAddress;
    this.mapSearchResults = [];
    this.mapAddressDetails = this.cloneAddressDetails(this.getAddressDetails(field, this.activeStopIndex));
    this.isMapPickerOpen = true;
  }

  closeMapPicker(): void {
    this.isMapPickerOpen = false;
    this.mapSearchResults = [];
    this.pendingMapSelection = undefined;
    this.activeStopIndex = null;
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
    if (!result.coordinate) {
      this.geocodingService.resolveAddress(result).subscribe((resolved) => {
        this.pendingMapSelection = resolved;
        this.mapSearchQuery = resolved.address;
      });
    }
  }

  handleMapMarkerDrag(event: GmMapMarkerDragEvent): void {
    if (this.activeAddressField === 'stop') {
      if (event.kind === 'stop' && event.index === this.activeStopIndex) {
        this.useMapCoordinate(event.coordinate);
      }
      return;
    }

    if (event.kind === this.activeAddressField) {
      this.useMapCoordinate(event.coordinate);
    }
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
    if (!this.pendingMapSelection || !this.mapDetailsComplete) {
      return;
    }

    this.geocodingService.resolveAddress(this.pendingMapSelection).subscribe((resolved) => {
      if (this.activeAddressField === 'pickup') {
        this.applyPickup(resolved);
        this.pickupDetails = this.cloneAddressDetails(this.mapAddressDetails);
      } else if (this.activeAddressField === 'dropoff') {
        this.applyDropoff(resolved);
        this.dropoffDetails = this.cloneAddressDetails(this.mapAddressDetails);
      } else if (this.activeStopIndex !== null) {
        this.applyStop(this.activeStopIndex, resolved);
        this.stopDetails[this.activeStopIndex] = this.cloneAddressDetails(this.mapAddressDetails);
      }

      this.saveConfirmedAddress(resolved, this.mapAddressDetails);
      this.closeMapPicker();
    });
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
    this.appendDetailsQuery(queryParams, 'pickup', this.pickupDetails);
    if (this.dropoffAddress.trim()) {
      queryParams['dropoff'] = this.dropoffAddress.trim();
    }
    if (this.dropoffCoordinate) {
      queryParams['dropoffLat'] = String(this.dropoffCoordinate.lat);
      queryParams['dropoffLng'] = String(this.dropoffCoordinate.lng);
    }
    this.appendDetailsQuery(queryParams, 'dropoff', this.dropoffDetails);
    let stopQueryIndex = 1;
    this.stopAddresses.forEach((address, index) => {
      const trimmedAddress = address.trim();
      if (!trimmedAddress) {
        return;
      }

      const queryIndex = stopQueryIndex;
      queryParams[`stop${queryIndex}`] = trimmedAddress;
      const coordinate = this.stopCoordinates[index];
      if (coordinate) {
        queryParams[`stop${queryIndex}Lat`] = String(coordinate.lat);
        queryParams[`stop${queryIndex}Lng`] = String(coordinate.lng);
      }
      this.appendDetailsQuery(queryParams, `stop${queryIndex}`, this.stopDetails[index] ?? this.createEmptyAddressDetails());
      stopQueryIndex += 1;
    });
    if (this.scheduleMode === 'scheduled' && this.scheduledAt) {
      queryParams['scheduleMode'] = 'scheduled';
      queryParams['scheduledAt'] = this.scheduledAt;
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

  private searchStopAddress(index: number, query: string): void {
    if (query.trim().length < 2) {
      this.stopSuggestions[index] = [];
      return;
    }

    this.geocodingService.searchAddress(query).subscribe((results) => {
      this.stopSuggestions[index] = results.slice(0, 4);
    });
  }

  private applyAddressSearchResult(result: GmAddressSearchResult): void {
    if (this.addressSearchField === 'pickup') {
      this.applyPickup(result);
    } else if (this.addressSearchField === 'dropoff') {
      this.applyDropoff(result);
    } else if (this.addressSearchStopIndex !== null) {
      this.stopAddresses[this.addressSearchStopIndex] = result.address;
      if (result.coordinate) {
        this.stopCoordinates[this.addressSearchStopIndex] = result.coordinate;
      }
      this.stopSuggestions[this.addressSearchStopIndex] = [];
    }

    this.closeAddressSearch();
  }

  private applyPickup(result: GmAddressSearchResult): void {
    this.pickupAddress = result.address;
    if (result.coordinate) {
      this.pickupCoordinate = result.coordinate;
    }
  }

  private applyDropoff(result: GmAddressSearchResult): void {
    this.dropoffAddress = result.address;
    if (result.coordinate) {
      this.dropoffCoordinate = result.coordinate;
    }
  }

  private applyStop(index: number, result: GmAddressSearchResult): void {
    this.stopAddresses[index] = result.address;
    if (result.coordinate) {
      this.stopCoordinates[index] = result.coordinate;
    }
    this.stopSuggestions[index] = [];
    if (!this.stopDetails[index]) {
      this.stopDetails[index] = this.createEmptyAddressDetails();
    }
  }

  private swapPickupDropoff(): void {
    const nextPickupAddress = this.dropoffAddress;
    const nextPickupCoordinate = this.dropoffCoordinate;
    const nextPickupDetails = this.cloneAddressDetails(this.dropoffDetails);

    this.dropoffAddress = this.pickupAddress;
    this.dropoffCoordinate = this.pickupCoordinate;
    this.dropoffDetails = this.cloneAddressDetails(this.pickupDetails);

    this.pickupAddress = nextPickupAddress;
    this.pickupCoordinate = nextPickupCoordinate;
    this.pickupDetails = nextPickupDetails;
  }

  private getDestinationPointStates(): GmHomeRoutePointState[] {
    const stops = this.stopAddresses.map((address, index) => ({
      address,
      coordinate: this.stopCoordinates[index],
      details: this.cloneAddressDetails(this.stopDetails[index] ?? this.createEmptyAddressDetails()),
      suggestions: this.stopSuggestions[index] ?? [],
    }));

    return [
      ...stops,
      {
        address: this.dropoffAddress,
        coordinate: this.dropoffCoordinate,
        details: this.cloneAddressDetails(this.dropoffDetails),
        suggestions: this.dropoffSuggestions,
      },
    ];
  }

  private applyDestinationPointStates(points: GmHomeRoutePointState[]): void {
    const nextDropoff = points[points.length - 1];
    const nextStops = points.slice(0, -1);

    this.stopAddresses = nextStops.map((point) => point.address);
    this.stopCoordinates = nextStops.map((point) => point.coordinate);
    this.stopDetails = nextStops.map((point) => this.cloneAddressDetails(point.details));
    this.stopSuggestions = nextStops.map((point) => point.suggestions);

    this.dropoffAddress = nextDropoff?.address ?? '';
    this.dropoffCoordinate = nextDropoff?.coordinate;
    this.dropoffDetails = nextDropoff ? this.cloneAddressDetails(nextDropoff.details) : this.createEmptyAddressDetails();
    this.dropoffSuggestions = nextDropoff?.suggestions ?? [];
  }

  private getCurrentAddress(field: GmHomeAddressField, stopIndex: number | null): string {
    if (field === 'pickup') {
      return this.pickupAddress;
    }
    if (field === 'dropoff') {
      return this.dropoffAddress;
    }
    return stopIndex !== null ? this.stopAddresses[stopIndex] ?? '' : '';
  }

  private getCurrentCoordinate(field: GmHomeAddressField, stopIndex: number | null): GmCoordinate | undefined {
    if (field === 'pickup') {
      return this.pickupCoordinate;
    }
    if (field === 'dropoff') {
      return this.dropoffCoordinate;
    }
    return stopIndex !== null ? this.stopCoordinates[stopIndex] : undefined;
  }

  private getAddressDetails(field: GmHomeAddressField, stopIndex: number | null): GmHomeAddressDetails {
    if (field === 'pickup') {
      return this.pickupDetails;
    }
    if (field === 'dropoff') {
      return this.dropoffDetails;
    }
    return stopIndex !== null ? this.stopDetails[stopIndex] ?? this.createEmptyAddressDetails() : this.createEmptyAddressDetails();
  }

  private createEmptyAddressDetails(): GmHomeAddressDetails {
    return {
      unit: '',
      phone: '',
      contactName: '',
      saveAddress: false,
    };
  }

  private cloneAddressDetails(details: GmHomeAddressDetails): GmHomeAddressDetails {
    return { ...details };
  }

  private appendDetailsQuery(queryParams: Record<string, string>, prefix: string, details: GmHomeAddressDetails): void {
    if (details.unit.trim()) {
      queryParams[`${prefix}Unit`] = details.unit.trim();
    }
    if (details.phone.trim()) {
      queryParams[`${prefix}Phone`] = details.phone.trim();
    }
    if (details.contactName.trim()) {
      queryParams[`${prefix}Contact`] = details.contactName.trim();
    }
  }

  private saveConfirmedAddress(result: GmAddressSearchResult, details: GmHomeAddressDetails): void {
    if (!details.saveAddress || !result.coordinate) {
      return;
    }

    this.customerAddressService
      .createAddress({
        label: details.contactName.trim() || null,
        address: result.address,
        lat: result.coordinate.lat,
        lng: result.coordinate.lng,
      })
      .subscribe({
        next: () => this.loadSavedAddresses(),
        error: () => undefined,
      });
  }

  private loadSavedAddresses(): void {
    this.savedAddressesLoading = true;
    this.savedAddressSub?.unsubscribe();
    this.savedAddressSub = this.customerAddressService.getAddresses().subscribe({
      next: (addresses) => {
        this.savedAddresses = addresses;
        this.savedAddressesLoading = false;
      },
      error: () => {
        this.savedAddresses = [];
        this.savedAddressesLoading = false;
      },
    });
  }

  private formatScheduleLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Đặt lịch';
    }

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();

    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    if (isToday) {
      return `Hôm nay, ${timeStr}`;
    }
    if (isTomorrow) {
      return `Ngày mai, ${timeStr}`;
    }

    const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = daysOfWeek[date.getDay()];
    const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

    return `${dayName}, ${dateStr} ${timeStr}`;
  }

  private toDateTimeLocal(date: Date): string {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
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
