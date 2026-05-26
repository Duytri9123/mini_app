import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import {
  GmAdditionalServiceKey,
  GmBookingType,
  GmPaymentMethod,
  GmPorterOptions,
} from '../../core/interfaces/booking.interface';
import { GmCoordinate } from '../../core/interfaces/location.interface';
import { GmVehicleType } from '../../core/interfaces/vehicle.interface';
import {
  GM_ADDITIONAL_SERVICES,
  GM_SERVICE_OPTIONS,
  GM_VEHICLE_OPTIONS,
  GmAdditionalServiceOption,
  GmServiceOption,
  GmVehicleOption,
} from '../../core/constants/gm-services.constants';
import { GmBookingService } from '../../core/services/gm-booking.service';
import { GmDriverService } from '../../core/services/gm-driver.service';
import { GmGeocodingService, GmAddressSearchResult } from '../../core/services/gm-geocoding.service';
import { GmPaymentMethodOption, GmPaymentService } from '../../core/services/gm-payment.service';
import { GmToastService } from '../../core/services/gm-toast.service';
import { GmDriver } from '../../core/interfaces/driver.interface';
import { GmUser } from '../../core/interfaces/user.interface';
import { GmAuthService } from '../../core/services/gm-auth.service';
import { calculateGapMovePrice, GmPriceBreakdown } from '../../core/utils/booking-price.utils';
import { formatVnd } from '../../core/utils/helpers';
import { GmMapComponent } from '../../shared/components/gm-map/gm-map.component';

interface GmBookingDrawerItem {
  label: string;
  icon: string;
  route?: string;
  type?: GmBookingType;
  description?: string;
  badge?: string;
}

interface GmBookingDrawerGroup {
  title: string;
  items: GmBookingDrawerItem[];
}

@Component({
  selector: 'app-gm-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonicModule, GmMapComponent],
  templateUrl: './gm-booking.page.html',
  styleUrls: ['./gm-booking.page.scss'],
})
export class GmBookingPage implements OnInit, OnDestroy {
  readonly services = GM_SERVICE_OPTIONS;
  readonly vehicleOptions = GM_VEHICLE_OPTIONS;
  readonly additionalServiceOptions = GM_ADDITIONAL_SERVICES;

  type: GmBookingType = 'delivery';
  vehicleType: GmVehicleType = 'motorbike';
  paymentMethod: GmPaymentMethod = 'cash';
  pickupAddress = 'Ben Thanh, Quận 1, TP.HCM';
  dropoffAddress = 'Thảo Điền, TP. Thủ Đức';
  packageInfo = '';
  note = '';
  promoCode = '';
  codAmount = 0;
  declaredValue = 0;
  scheduleMode: 'now' | 'scheduled' = 'now';
  scheduledAt = '';
  stopAddresses: string[] = [];
  selectedAdditionalServices: GmAdditionalServiceKey[] = [];
  paymentMethods: GmPaymentMethodOption[] = [];
  nearbyDrivers: GmDriver[] = [];
  pickupSuggestions: GmAddressSearchResult[] = [];
  dropoffSuggestions: GmAddressSearchResult[] = [];
  activeAddressField: 'pickup' | 'dropoff' = 'pickup';
  isMapPickerOpen = false;
  isLocating = false;
  isServiceDrawerOpen = false;
  mapSearchQuery = '';
  mapSearchResults: GmAddressSearchResult[] = [];
  pendingMapSelection?: GmAddressSearchResult;
  selectedDrawerItem?: GmBookingDrawerItem;
  user: GmUser | null = null;
  readonly drawerGroups: GmBookingDrawerGroup[] = [
    {
      title: 'Dịch vụ',
      items: [
        { label: 'Giao hàng nhanh', icon: 'cube-outline', type: 'delivery', description: 'Tài liệu, hàng nhỏ, giao nhiều điểm.' },
        { label: 'Đa đơn - Đa điểm', icon: 'git-network-outline', type: 'multi_stop', description: 'Nhập nhiều điểm giao trong một bảng.', badge: 'Mới' },
        { label: 'Đặt xe', icon: 'navigate-outline', type: 'ride', description: 'Xe máy, ô tô, đặt ngay hoặc đặt lịch.' },
        { label: 'Xe tải / xe van', icon: 'bus-outline', type: 'truck', description: 'Van, bán tải, tải 500kg đến 2 tấn.' },
        { label: 'Chuyển nhà mini', icon: 'home-outline', type: 'moving', description: 'Đóng gói, tháo lắp, bốc xếp, vận chuyển.' },
        { label: 'Bê hộ hàng', icon: 'barbell-outline', type: 'porter', description: 'Thuê người bê hàng độc lập hoặc kèm chuyến xe.' },
      ],
    },
    {
      title: 'Đơn hàng',
      items: [
        { label: 'Lịch sử đơn hàng', icon: 'time-outline', route: '/gap-move/bookings' },
        { label: 'Đơn hàng nháp', icon: 'document-text-outline', route: '/gap-move/bookings' },
        { label: 'Tài xế yêu thích', icon: 'heart-outline', route: '/gap-move/drivers' },
      ],
    },
    {
      title: 'Tài khoản',
      items: [
        { label: 'Tài khoản của tôi', icon: 'wallet-outline', route: '/gap-move/profile' },
        { label: 'Thống kê', icon: 'bar-chart-outline', route: '/gap-move/wallet' },
        { label: 'Thành viên', icon: 'ribbon-outline', route: '/gap-move/rewards' },
      ],
    },
    {
      title: 'Hỗ trợ & Tin tức',
      items: [
        { label: 'Tin tức', icon: 'megaphone-outline', route: '/gap-move/news' },
        { label: 'Trung tâm trợ giúp', icon: 'help-circle-outline', route: '/gap-move/faq' },
        { label: 'GapMove Insights', icon: 'grid-outline', route: '/gap-move/news/business' },
      ],
    },
  ];

  private pickupSearchTimer?: ReturnType<typeof setTimeout>;
  private dropoffSearchTimer?: ReturnType<typeof setTimeout>;
  private mapSearchTimer?: ReturnType<typeof setTimeout>;
  private driverSub?: Subscription;
  private authSub?: Subscription;

  pickupCoordinate: GmCoordinate = {
    lat: 10.7769,
    lng: 106.7009,
    address: this.pickupAddress,
  };
  dropoffCoordinate: GmCoordinate = {
    lat: 10.802,
    lng: 106.731,
    address: this.dropoffAddress,
  };

  porterOptions: GmPorterOptions = {
    enabled: false,
    helperCount: 1,
    floorCount: 0,
    hasElevator: true,
    heavyItemCount: 0,
    bulkyItemCount: 0,
    carryDistanceMeters: 0,
    bothWays: false,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: GmBookingService,
    private driverService: GmDriverService,
    private geocodingService: GmGeocodingService,
    private paymentService: GmPaymentService,
    private toastService: GmToastService,
    private authService: GmAuthService,
  ) {}

  ngOnInit(): void {
    const routeType = this.route.snapshot.data['bookingType'];
    const queryType = this.route.snapshot.queryParamMap.get('type');
    const initialType = this.parseBookingType(queryType || routeType);
    if (initialType) {
      this.selectService(initialType);
    }

    const queryVehicleType = this.route.snapshot.queryParamMap.get('vehicleType');
    if (this.isVehicleType(queryVehicleType)) {
      this.vehicleType = queryVehicleType;
    }

    const queryPickup = this.route.snapshot.queryParamMap.get('pickup');
    if (queryPickup) {
      this.pickupAddress = queryPickup;
      this.pickupCoordinate = {
        ...this.pickupCoordinate,
        address: queryPickup,
      };
    }
    const queryPickupLat = this.getQueryNumber('pickupLat');
    const queryPickupLng = this.getQueryNumber('pickupLng');
    if (queryPickupLat !== null && queryPickupLng !== null) {
      this.pickupCoordinate = {
        lat: queryPickupLat,
        lng: queryPickupLng,
        address: this.pickupAddress,
      };
    } else if (!queryPickup) {
      this.useCurrentLocation();
    }

    const queryDropoff = this.route.snapshot.queryParamMap.get('dropoff');
    if (queryDropoff) {
      this.dropoffAddress = queryDropoff;
      this.dropoffCoordinate = {
        ...this.dropoffCoordinate,
        address: queryDropoff,
      };
    }
    const queryDropoffLat = this.getQueryNumber('dropoffLat');
    const queryDropoffLng = this.getQueryNumber('dropoffLng');
    if (queryDropoffLat !== null && queryDropoffLng !== null) {
      this.dropoffCoordinate = {
        lat: queryDropoffLat,
        lng: queryDropoffLng,
        address: this.dropoffAddress,
      };
    }

    this.paymentService.getPaymentMethods().subscribe((methods) => (this.paymentMethods = methods));
    this.driverSub = this.driverService.getNearbyDrivers().subscribe((drivers) => (this.nearbyDrivers = drivers));
    this.authSub = this.authService.currentUser$.subscribe((user) => (this.user = user));
    this.selectedDrawerItem = this.drawerGroups[0].items.find((item) => item.type === this.type) ?? this.drawerGroups[0].items[0];
  }

  ngOnDestroy(): void {
    clearTimeout(this.pickupSearchTimer);
    clearTimeout(this.dropoffSearchTimer);
    clearTimeout(this.mapSearchTimer);
    this.driverSub?.unsubscribe();
    this.authSub?.unsubscribe();
  }

  get selectedService(): GmServiceOption {
    return this.services.find((service) => service.id === this.type) ?? this.services[0];
  }

  get availableVehicleOptions(): GmVehicleOption[] {
    if (this.type === 'ride') {
      return this.vehicleOptions.filter((vehicle) => vehicle.id === 'motorbike' || vehicle.id === 'car');
    }
    if (this.type === 'delivery') {
      return this.vehicleOptions.filter((vehicle) => vehicle.id !== 'car');
    }
    if (this.type === 'multi_stop') {
      return this.vehicleOptions.filter((vehicle) => vehicle.id === 'motorbike' || vehicle.id === 'van');
    }
    if (this.type === 'porter') {
      return this.vehicleOptions.filter((vehicle) => vehicle.id === 'motorbike');
    }
    return this.vehicleOptions.filter((vehicle) => vehicle.id === 'van' || vehicle.id === 'truck');
  }

  get isPorterVisible(): boolean {
    return this.type === 'porter' || this.porterOptions.enabled || this.selectedAdditionalServices.includes('porter');
  }

  get mapPickerPickup(): GmCoordinate {
    if (this.activeAddressField === 'pickup' && this.pendingMapSelection) {
      return this.pendingMapSelection.coordinate;
    }
    return this.pickupCoordinate;
  }

  get mapPickerDropoff(): GmCoordinate {
    if (this.activeAddressField === 'dropoff' && this.pendingMapSelection) {
      return this.pendingMapSelection.coordinate;
    }
    return this.dropoffCoordinate;
  }

  get pendingMapAddress(): string {
    return this.pendingMapSelection?.address ?? 'Chạm bản đồ, tìm địa chỉ hoặc dùng vị trí hiện tại';
  }

  get estimateDistanceKm(): number {
    if (this.type === 'porter') {
      return 0;
    }
    if (this.vehicleType === 'truck') {
      return 12.8;
    }
    if (this.vehicleType === 'van') {
      return 8.6;
    }
    return 6.4;
  }

  get estimateDurationMin(): number {
    if (this.type === 'porter') {
      return Math.max(30, this.porterOptions.helperCount * 20 + this.porterOptions.floorCount * 8);
    }
    return Math.ceil(this.estimateDistanceKm * 3.6);
  }

  get priceEstimate(): GmPriceBreakdown {
    return calculateGapMovePrice({
      type: this.type,
      vehicleType: this.vehicleType,
      distanceKm: this.estimateDistanceKm,
      durationMin: this.estimateDurationMin,
      voucherDiscount: this.promoCode.trim() ? 10000 : 0,
      porterOptions: this.porterOptions,
      additionalServiceCount: this.selectedAdditionalServices.filter((item) => item !== 'porter').length,
    });
  }

  selectService(type: GmBookingType): void {
    if (type === 'multi_stop') {
      this.router.navigate(['/gap-move/multi-stop'], { queryParams: this.buildCurrentQuery(type) });
      return;
    }

    this.type = type;
    this.selectedDrawerItem = this.drawerGroups[0].items.find((item) => item.type === type) ?? this.selectedDrawerItem;
    const option = this.services.find((item) => item.id === type);
    this.vehicleType = option?.vehicleType ?? 'motorbike';

    if (type === 'porter') {
      this.porterOptions.enabled = true;
      this.ensureAdditionalService('porter');
    }

    if (type === 'moving') {
      this.porterOptions.enabled = true;
      this.ensureAdditionalService('porter');
      this.ensureAdditionalService('packing');
      this.ensureAdditionalService('assembly');
    }
  }

  selectVehicle(vehicleType: GmVehicleType): void {
    this.vehicleType = vehicleType;
  }

  toggleAdditionalService(service: GmAdditionalServiceOption): void {
    const selected = this.selectedAdditionalServices.includes(service.id);
    this.selectedAdditionalServices = selected
      ? this.selectedAdditionalServices.filter((item) => item !== service.id)
      : [...this.selectedAdditionalServices, service.id];

    if (service.id === 'porter') {
      this.porterOptions.enabled = !selected;
    }
  }

  isAdditionalSelected(serviceId: GmAdditionalServiceKey): boolean {
    return this.selectedAdditionalServices.includes(serviceId);
  }

  addStop(): void {
    this.stopAddresses = [...this.stopAddresses, ''];
  }

  removeStop(index: number): void {
    this.stopAddresses = this.stopAddresses.filter((_, itemIndex) => itemIndex !== index);
  }

  goBack(): void {
    window.history.back();
  }

  openServiceDrawer(): void {
    this.isServiceDrawerOpen = true;
  }

  closeServiceDrawer(): void {
    this.isServiceDrawerOpen = false;
  }

  selectDrawerItem(item: GmBookingDrawerItem): void {
    this.selectedDrawerItem = item;
    if (item.type) {
      if (item.type === 'multi_stop') {
        this.router.navigate(['/gap-move/multi-stop'], { queryParams: this.buildCurrentQuery(item.type) });
        return;
      }
      this.selectService(item.type);
      return;
    }

    if (item.route) {
      this.closeServiceDrawer();
      this.router.navigateByUrl(item.route);
    }
  }

  openDrawerRoute(item: GmBookingDrawerItem): void {
    if (item.route) {
      this.router.navigateByUrl(item.route);
    }
  }

  searchPickup(): void {
    if (this.pickupAddress.trim().length < 2) {
      this.pickupSuggestions = [];
      return;
    }
    this.geocodingService.searchAddress(this.pickupAddress).subscribe((results) => {
      this.pickupSuggestions = results.slice(0, 4);
    });
  }

  searchDropoff(): void {
    if (this.dropoffAddress.trim().length < 2) {
      this.dropoffSuggestions = [];
      return;
    }
    this.geocodingService.searchAddress(this.dropoffAddress).subscribe((results) => {
      this.dropoffSuggestions = results.slice(0, 4);
    });
  }

  usePickupSuggestion(result: GmAddressSearchResult): void {
    this.applyPickup(result);
    this.pickupSuggestions = [];
  }

  useDropoffSuggestion(result: GmAddressSearchResult): void {
    this.applyDropoff(result);
    this.dropoffSuggestions = [];
  }

  onAddressInput(field: 'pickup' | 'dropoff'): void {
    if (field === 'pickup') {
      clearTimeout(this.pickupSearchTimer);
      this.pickupSearchTimer = setTimeout(() => this.searchPickup(), 250);
      return;
    }

    clearTimeout(this.dropoffSearchTimer);
    this.dropoffSearchTimer = setTimeout(() => this.searchDropoff(), 250);
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

  openMapPicker(field: 'pickup' | 'dropoff'): void {
    this.activeAddressField = field;
    const currentCoordinate = field === 'pickup' ? this.pickupCoordinate : this.dropoffCoordinate;
    const currentAddress = field === 'pickup' ? this.pickupAddress : this.dropoffAddress;
    this.pendingMapSelection = {
      address: currentAddress,
      coordinate: currentCoordinate,
    };
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
      this.toastService.error('Trình duyệt chưa hỗ trợ lấy vị trí hiện tại');
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
        this.toastService.error('Không lấy được vị trí hiện tại');
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

  formatAmount(amount: number): string {
    return formatVnd(amount);
  }

  accentClass(service: GmServiceOption): string {
    const map: Record<GmServiceOption['accent'], string> = {
      teal: 'border-[#008c95] bg-[#008c95]/5 text-[#008c95]',
      orange: 'border-[#ff5a00] bg-[#ff5a00]/5 text-[#ff5a00]',
      slate: 'border-slate-900 bg-slate-900/5 text-slate-900',
      green: 'border-emerald-600 bg-emerald-50 text-emerald-700',
    };
    return map[service.accent];
  }

  serviceIconClass(service: GmServiceOption): string {
    const map: Record<GmServiceOption['accent'], string> = {
      teal: 'bg-[#008c95] text-white',
      orange: 'bg-[#ff5a00] text-white',
      slate: 'bg-slate-900 text-white',
      green: 'bg-emerald-600 text-white',
    };
    return map[service.accent];
  }

  serviceSpriteClass(service: GmServiceOption): string {
    if (service.id === 'multi_stop') {
      return 'gm-vehicle-sprite-multistop';
    }
    if (service.id === 'porter') {
      return 'gm-vehicle-sprite-porter';
    }
    if (service.id === 'moving') {
      return 'gm-vehicle-sprite-moving';
    }
    if (service.id === 'ride') {
      return 'gm-vehicle-sprite-bike';
    }
    return this.vehicleSpriteClass(service.vehicleType);
  }

  vehicleSpriteClass(vehicleType: GmVehicleType): string {
    const map: Record<GmVehicleType, string> = {
      motorbike: 'gm-vehicle-sprite-bike',
      car: 'gm-vehicle-sprite-car',
      van: 'gm-vehicle-sprite-van',
      truck: 'gm-vehicle-sprite-truck',
    };
    return map[vehicleType];
  }

  drawerSpriteClass(item: GmBookingDrawerItem): string {
    const service = item.type ? this.services.find((option) => option.id === item.type) : undefined;
    return service ? this.serviceSpriteClass(service) : '';
  }

  submit(): void {
    const porterOptions = this.porterOptions.enabled ? this.porterOptions : undefined;
    const additionalServices = this.porterOptions.enabled
      ? Array.from(new Set([...this.selectedAdditionalServices, 'porter' as const]))
      : this.selectedAdditionalServices.filter((item) => item !== 'porter');

    this.bookingService
      .createBooking({
        type: this.type,
        vehicleType: this.vehicleType,
        paymentMethod: this.paymentMethod,
        additionalServices,
        porterOptions,
        packageInfo: this.type !== 'ride' ? this.packageInfo : undefined,
        promoCode: this.promoCode,
        scheduledAt: this.scheduleMode === 'scheduled' ? this.scheduledAt : undefined,
        note: this.buildNote(),
        stops: this.stopAddresses
          .filter((address) => address.trim())
          .map((address, index) => ({
            id: `stop-${index + 1}`,
            label: `Điểm dừng ${index + 1}`,
            address,
            coordinate: {
              lat: this.pickupCoordinate.lat + (index + 1) * 0.01,
              lng: this.pickupCoordinate.lng + (index + 1) * 0.01,
              address,
            },
          })),
        pickup: {
          id: 'pickup-form',
          label: this.type === 'porter' ? 'Điểm bê hàng' : 'Điểm lấy/đón',
          address: this.pickupAddress,
          coordinate: this.pickupCoordinate,
        },
        dropoff: {
          id: 'dropoff-form',
          label: this.type === 'porter' ? 'Điểm hoàn tất' : 'Điểm giao/đến',
          address: this.dropoffAddress,
          coordinate: this.dropoffCoordinate,
        },
      })
      .subscribe((booking) => {
        this.toastService.success('Đã tạo đơn GapMove');
        this.router.navigate(['/gap-move/booking/confirm'], { queryParams: { id: booking.id } });
      });
  }

  private ensureAdditionalService(service: GmAdditionalServiceKey): void {
    if (!this.selectedAdditionalServices.includes(service)) {
      this.selectedAdditionalServices = [...this.selectedAdditionalServices, service];
    }
  }

  private buildNote(): string {
    const noteParts = [
      this.note.trim(),
      this.codAmount > 0 ? `COD: ${this.codAmount}` : '',
      this.declaredValue > 0 ? `Giá trị khai báo: ${this.declaredValue}` : '',
    ].filter(Boolean);

    return noteParts.join(' | ');
  }

  private applyPickup(result: GmAddressSearchResult): void {
    this.pickupAddress = result.address;
    this.pickupCoordinate = result.coordinate;
  }

  private applyDropoff(result: GmAddressSearchResult): void {
    this.dropoffAddress = result.address;
    this.dropoffCoordinate = result.coordinate;
  }

  private getQueryNumber(key: string): number | null {
    const value = this.route.snapshot.queryParamMap.get(key);
    if (value === null) {
      return null;
    }
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  private parseBookingType(value: unknown): GmBookingType | null {
    return value === 'ride' || value === 'delivery' || value === 'truck' || value === 'moving' || value === 'porter' || value === 'multi_stop'
      ? value
      : null;
  }

  private buildCurrentQuery(type: GmBookingType): Record<string, string> {
    return {
      type,
      pickup: this.pickupAddress,
      dropoff: this.dropoffAddress,
    };
  }

  private isVehicleType(value: unknown): value is GmVehicleType {
    return value === 'motorbike' || value === 'car' || value === 'van' || value === 'truck';
  }
}
