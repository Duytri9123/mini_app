import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
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
import { GmCoordinate, GmCustomerAddress } from '../../core/interfaces/location.interface';
import { GmVehicleType } from '../../core/interfaces/vehicle.interface';
import {
  GM_ADDITIONAL_SERVICES,
  GM_SERVICE_OPTIONS,
  GM_VEHICLE_OPTIONS,
  GmAdditionalServiceOption,
  GmServiceOption,
  GmVehicleOption,
} from '../../core/constants/gm-services.constants';
import { GM_STORAGE_KEYS } from '../../core/constants/gm-api.constants';
import { GmBookingService } from '../../core/services/gm-booking.service';
import { GmDriverService } from '../../core/services/gm-driver.service';
import { GmGeocodingService, GmAddressSearchResult } from '../../core/services/gm-geocoding.service';
import { GmCustomerAddressService } from '../../core/services/gm-customer-address.service';
import { GmLocationService } from '../../core/services/gm-location.service';
import { GmPaymentMethodOption, GmPaymentService } from '../../core/services/gm-payment.service';
import { GmToastService } from '../../core/services/gm-toast.service';
import { GmDriver } from '../../core/interfaces/driver.interface';
import { GmUser } from '../../core/interfaces/user.interface';
import { GmAuthService } from '../../core/services/gm-auth.service';
import { calculateGapMovePrice, GmPriceBreakdown } from '../../core/utils/booking-price.utils';
import { formatVnd } from '../../core/utils/helpers';
import {
  GmLocationMapPickerComponent,
  GmLocationMapAddressDetails,
} from '../../shared/components/gm-location-picker/gm-location-map-picker.component';
import {
  GmLocationSearchHistoryItem,
  GmLocationSearchPickerComponent,
} from '../../shared/components/gm-location-picker/gm-location-search-picker.component';
import { GmMapComponent, GmMapMarkerDragEvent } from '../../shared/components/gm-map/gm-map.component';
import { GmBookingOrderDetailsComponent } from './components/gm-booking-order-details.component';
import { GmBookingRouteFormComponent } from './components/gm-booking-route-form.component';
import {
  GmBookingAddressField,
  GmBookingAddressTarget,
  GmBookingDestinationPointMove,
  GmBookingSavedAddressSelection,
  GmBookingStopAddressChange,
  GmBookingSuggestionSelection,
} from './components/gm-booking-location.types';

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

interface GmBookingRoutePointState {
  address: string;
  coordinate?: GmCoordinate;
  suggestions: GmAddressSearchResult[];
}

interface GmDeliveryServiceOption {
  id: GmBookingType;
  title: string;
  subtitle: string;
  spriteClass: string;
  price: number;
  vehicleType?: GmVehicleType;
}

type GmPromoOffer = {
  id: string;
  title: string;
  logo: string;
  accentClass: string;
  warning?: string;
  disabled?: boolean;
};

interface GmBookingConfirmedAddressHistoryItem {
  id: string;
  address: string;
  coordinate: GmCoordinate;
  details: GmLocationMapAddressDetails;
  confirmedAt: number;
}

@Component({
  selector: 'app-gm-booking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonicModule,
    GmMapComponent,
    GmBookingRouteFormComponent,
    GmBookingOrderDetailsComponent,
    GmLocationSearchPickerComponent,
    GmLocationMapPickerComponent,
  ],
  templateUrl: './gm-booking.page.html',
  styleUrls: ['./gm-booking.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class GmBookingPage implements OnInit, OnDestroy {
  readonly services = GM_SERVICE_OPTIONS;
  readonly vehicleOptions = GM_VEHICLE_OPTIONS;
  readonly additionalServiceOptions = GM_ADDITIONAL_SERVICES;

  type: GmBookingType = 'delivery';
  vehicleType: GmVehicleType = 'motorbike';
  paymentMethod: GmPaymentMethod = 'cash';
  pickupAddress = '';
  dropoffAddress = '';
  packageInfo = '';
  senderName = '';
  senderPhone = '';
  receiverName = '';
  receiverPhone = '';
  itemCount = 1;
  weightKg = 0;
  lengthCm = 0;
  widthCm = 0;
  heightCm = 0;
  trackingCode = '';
  note = '';
  promoCode = '';
  codAmount = 0;
  declaredValue = 0;
  receiverPays = false;
  scheduleMode: 'now' | 'scheduled' = 'now';
  scheduledAt = '';
  stopAddresses: string[] = [];
  stopCoordinates: Array<GmCoordinate | undefined> = [];
  selectedAdditionalServices: GmAdditionalServiceKey[] = [];
  paymentMethods: GmPaymentMethodOption[] = [];
  nearbyDrivers: GmDriver[] = [];
  pickupSuggestions: GmAddressSearchResult[] = [];
  dropoffSuggestions: GmAddressSearchResult[] = [];
  stopSuggestions: GmAddressSearchResult[][] = [];
  savedAddresses: GmCustomerAddress[] = [];
  savedAddressesLoading = false;
  activeAddressField: GmBookingAddressField = 'pickup';
  activeStopIndex: number | null = null;
  isRouteReorderMode = false;
  isMapPickerOpen = false;
  isLocating = false;
  isServiceDrawerOpen = false;
  isDeliveryServiceSheetOpen = false;
  isPaymentSheetOpen = false;
  isPromoSheetOpen = false;
  isScheduleSheetOpen = false;
  isConfirmSheetOpen = false;
  isChildModalActive = false;
  serviceSheetAutoOpened = false;
  private _cachedDeliveryServiceOptions: GmDeliveryServiceOption[] = [];
  private _lastEstimateKey = '';
  pendingDeliveryServiceId: GmBookingType = this.type;
  pendingVehicleType: GmVehicleType = this.vehicleType;
  selectedPromoId = '';
  promoTab: 'code' | 'vpoint' = 'code';
  mapSearchQuery = '';
  mapSearchResults: GmAddressSearchResult[] = [];
  pendingMapSelection?: GmAddressSearchResult;
  isMapPickerMapOpen = false;
  isMapPickerSavedAddressesOpen = false;
  confirmedAddressHistory: GmBookingConfirmedAddressHistoryItem[] = [];
  mapAddressDetails: GmLocationMapAddressDetails = {
    unit: '',
    phone: '',
    contactName: '',
    note: '',
    saveAddress: false,
  };
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
  readonly promoOffers: GmPromoOffer[] = [
    {
      id: 'GREEN25',
      title: 'Green Express | Ưu đãi giảm 25% tối đa 100.000 VNĐ',
      logo: 'G',
      accentClass: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'GM5',
      title: 'Giảm 5% tối đa 30.000 VNĐ',
      logo: '5%',
      accentClass: 'bg-cyan-50 text-[#008c95]',
    },
    {
      id: 'SHOPEEPAY50',
      title: 'SHOPEEPAY | Bạn mới: Giảm 50% tối đa 20.000 VNĐ',
      logo: 'S Pay',
      accentClass: 'bg-orange-50 text-orange-500',
      warning: 'Phương thức thanh toán không đủ điều kiện',
      disabled: true,
    },
    {
      id: 'VIKKI50',
      title: 'Vikki Mastercard | Giảm 50% tối đa 30K khi thanh toán qua thẻ',
      logo: 'Vikki',
      accentClass: 'bg-violet-50 text-violet-500',
      warning: 'Phương thức thanh toán không đủ điều kiện',
      disabled: true,
    },
    {
      id: 'NCB20',
      title: 'NCB | Giảm 20% tối đa 30.000 VNĐ khi thanh toán bằng thẻ',
      logo: 'NCB',
      accentClass: 'bg-slate-50 text-slate-400',
      warning: 'Phương thức thanh toán không đủ điều kiện',
      disabled: true,
    },
  ];
  readonly addPaymentMethods = [
    { label: 'Thẻ quốc tế', icon: 'card-outline' },
    { label: 'MoMo', icon: 'phone-portrait-outline', image: 'assets/images/momo.png' },
    { label: 'ShopeePay', icon: 'wallet-outline' },
    { label: 'Zalopay', icon: 'wallet-outline' },
    { label: 'Viettel Money', icon: 'phone-portrait-outline' },
  ];

  private pickupSearchTimer?: ReturnType<typeof setTimeout>;
  private dropoffSearchTimer?: ReturnType<typeof setTimeout>;
  private stopSearchTimers: Array<ReturnType<typeof setTimeout> | undefined> = [];
  private mapSearchTimer?: ReturnType<typeof setTimeout>;
  private driverSub?: Subscription;
  private authSub?: Subscription;
  private savedAddressSub?: Subscription;

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
    private customerAddressService: GmCustomerAddressService,
    private paymentService: GmPaymentService,
    private toastService: GmToastService,
    private authService: GmAuthService,
    private locationService: GmLocationService,
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

    const queryStops = this.getQueryStops();
    this.stopAddresses = queryStops.map((stop) => stop.address);
    this.stopCoordinates = queryStops.map((stop) => stop.coordinate);
    this.stopSuggestions = this.stopAddresses.map(() => []);

    const queryScheduleMode = this.route.snapshot.queryParamMap.get('scheduleMode');
    const queryScheduledAt = this.route.snapshot.queryParamMap.get('scheduledAt');
    if (queryScheduleMode === 'scheduled' && queryScheduledAt) {
      this.scheduleMode = 'scheduled';
      this.scheduledAt = queryScheduledAt;
    }

    this.paymentService.getPaymentMethods().subscribe((methods) => (this.paymentMethods = methods));
    this.driverSub = this.driverService.getNearbyDrivers().subscribe((drivers) => (this.nearbyDrivers = drivers));
    this.authSub = this.authService.currentUser$.subscribe((user) => (this.user = user));
    this.loadConfirmedAddressHistory();
    this.loadSavedAddresses();
    this.selectedDrawerItem = this.drawerGroups[0].items.find((item) => item.type === this.type) ?? this.drawerGroups[0].items[0];
    this.checkAndOpenServiceSheet();
  }

  ngOnDestroy(): void {
    clearTimeout(this.pickupSearchTimer);
    clearTimeout(this.dropoffSearchTimer);
    this.stopSearchTimers.forEach((timer) => clearTimeout(timer));
    clearTimeout(this.mapSearchTimer);
    this.driverSub?.unsubscribe();
    this.authSub?.unsubscribe();
    this.savedAddressSub?.unsubscribe();
  }

  get selectedService(): GmServiceOption {
    return this.services.find((service) => service.id === this.type) ?? this.services[0];
  }

  getServiceEstimateById(id: GmBookingType): number {
    const service = this.services.find((s) => s.id === id) ?? this.services[0];
    return this.getServiceEstimate(service);
  }

  get deliveryServiceOptions(): GmDeliveryServiceOption[] {
    const key = `${this.pickupAddress}_${this.dropoffAddress}_${this.promoCode}_${this.selectedAdditionalServices.join(',')}_${JSON.stringify(this.porterOptions)}`;
    if (key === this._lastEstimateKey && this._cachedDeliveryServiceOptions.length > 0) {
      return this._cachedDeliveryServiceOptions;
    }

    const bikeEstimate = this.getServiceEstimateById('delivery');
    
    const vanEstimate = calculateGapMovePrice({
      type: 'truck',
      vehicleType: 'van',
      distanceKm: this.estimateDistanceFor('truck', 'van'),
      durationMin: this.estimateDurationFor('truck', 'van'),
      voucherDiscount: this.promoCode.trim() ? 10000 : 0,
      porterOptions: this.porterOptions,
      additionalServiceCount: this.selectedAdditionalServices.filter((item) => item !== 'porter').length,
    }).finalAmount;

    const truckEstimate = calculateGapMovePrice({
      type: 'truck',
      vehicleType: 'truck',
      distanceKm: this.estimateDistanceFor('truck', 'truck'),
      durationMin: this.estimateDurationFor('truck', 'truck'),
      voucherDiscount: this.promoCode.trim() ? 10000 : 0,
      porterOptions: this.porterOptions,
      additionalServiceCount: this.selectedAdditionalServices.filter((item) => item !== 'porter').length,
    }).finalAmount;

    const bagacEstimate = calculateGapMovePrice({
      type: 'truck',
      vehicleType: 'bagac',
      distanceKm: this.estimateDistanceFor('truck', 'bagac'),
      durationMin: this.estimateDurationFor('truck', 'bagac'),
      voucherDiscount: this.promoCode.trim() ? 10000 : 0,
      porterOptions: this.porterOptions,
      additionalServiceCount: this.selectedAdditionalServices.filter((item) => item !== 'porter').length,
    }).finalAmount;

    this._lastEstimateKey = key;
    this._cachedDeliveryServiceOptions = [
      {
        id: 'delivery' as GmBookingType,
        title: 'Xe máy',
        subtitle: 'Hàng nhỏ, gọn nhẹ, giao nhanh',
        spriteClass: 'gm-vehicle-sprite-bike',
        price: bikeEstimate,
        vehicleType: 'motorbike',
      },
      {
        id: 'truck' as GmBookingType,
        title: 'Xe ba gác',
        subtitle: 'Hàng cồng kềnh, vật liệu, đồ gỗ',
        spriteClass: 'gm-vehicle-sprite-bagac',
        price: bagacEstimate,
        vehicleType: 'bagac',
      },
      {
        id: 'truck' as GmBookingType,
        title: 'Xe van',
        subtitle: 'Hàng trung bình, cần kín mưa',
        spriteClass: 'gm-vehicle-sprite-van',
        price: vanEstimate,
        vehicleType: 'van',
      },
      {
        id: 'truck' as GmBookingType,
        title: 'Xe tải',
        subtitle: 'Hàng cồng kềnh, chuyển trọn gói',
        spriteClass: 'gm-vehicle-sprite-truck',
        price: truckEstimate,
        vehicleType: 'truck',
      }
    ];

    return this._cachedDeliveryServiceOptions;
  }

  get selectedDeliveryService(): GmDeliveryServiceOption {
    return this.deliveryServiceOptions.find((service) => service.id === this.type && (!service.vehicleType || service.vehicleType === this.vehicleType)) ?? this.deliveryServiceOptions[0];
  }

  get pendingDeliveryService(): GmDeliveryServiceOption {
    return (
      this.deliveryServiceOptions.find(
        (service) =>
          service.id === this.pendingDeliveryServiceId &&
          (!service.vehicleType || service.vehicleType === this.pendingVehicleType),
      ) ?? this.deliveryServiceOptions[0]
    );
  }

  get pendingDeliveryServicePrice(): string {
    return this.formatAmount(this.pendingDeliveryService?.price ?? 0);
  }

  get hasRouteLocations(): boolean {
    return Boolean(this.pickupAddress.trim() && this.dropoffAddress.trim());
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

  get selectedVehicleOption(): GmVehicleOption {
    return this.vehicleOptions.find((vehicle) => vehicle.id === this.vehicleType) ?? this.vehicleOptions[0];
  }

  get vehicleServiceTitle(): string {
    return this.selectedVehicleOption.title;
  }

  get vehicleServiceSubtitle(): string {
    return this.selectedVehicleOption.subtitle;
  }

  get vehicleServicePrice(): string {
    return this.formatAmount(this.priceEstimate.finalAmount);
  }

  get paymentFooterLabel(): string {
    if (this.paymentMethod === 'wallet') {
      return 'Thẻ E-Green';
    }
    if (this.type === 'ride') {
      return 'Tiền mặt';
    }
    return this.receiverPays ? 'Người nhận trả tiền' : 'Người gửi trả tiền';
  }

  get promoFooterLabel(): string {
    const selectedCode = (this.selectedPromoId || this.promoCode).trim().toUpperCase();
    return selectedCode || 'Ưu đãi';
  }

  get promoActionLabel(): string {
    return this.promoCode.trim() || this.selectedPromoId ? 'Áp dụng ưu đãi' : 'Bỏ qua ưu đãi';
  }

  get scheduleFooterLabel(): string {
    if (this.scheduleMode === 'scheduled' && this.scheduledAt) {
      return this.formatScheduleLabel(this.scheduledAt);
    }

    return 'Ngay bây giờ';
  }

  get scheduleDraftLabel(): string {
    return this.scheduledAt ? this.formatScheduleLabel(this.scheduledAt) : 'Chọn thời gian';
  }

  get minScheduleDateTime(): string {
    return this.toDateTimeLocal(new Date(Date.now() + 15 * 60 * 1000));
  }

  get minScheduleDate(): string {
    return this.minScheduleDateTime.slice(0, 10);
  }

  get scheduledDate(): string {
    return this.scheduledAt ? this.scheduledAt.slice(0, 10) : '';
  }

  set scheduledDate(value: string) {
    const time = this.scheduledTime || '08:00';
    this.scheduledAt = value ? `${value}T${time}` : '';
  }

  get scheduledTime(): string {
    return this.scheduledAt && this.scheduledAt.length >= 16 ? this.scheduledAt.slice(11, 16) : '';
  }

  set scheduledTime(value: string) {
    const date = this.scheduledDate || this.minScheduleDate;
    this.scheduledAt = value ? `${date}T${value}` : (this.scheduledDate ? `${date}T08:00` : '');
  }

  get visibleAdditionalServiceOptions(): GmAdditionalServiceOption[] {
    if (this.type === 'ride') {
      return this.additionalServiceOptions.filter((service) => service.id === 'extended_duration' || service.id === 'insurance');
    }

    if (this.type === 'porter') {
      return this.additionalServiceOptions.filter((service) => service.id === 'extended_duration');
    }

    if (this.type === 'truck' || this.type === 'moving') {
      return this.additionalServiceOptions.filter((service) => service.id !== 'cod' && service.id !== 'cold_chain');
    }

    return this.additionalServiceOptions;
  }

  get isPorterVisible(): boolean {
    return this.type === 'porter' || this.porterOptions.enabled || this.selectedAdditionalServices.includes('porter');
  }

  get mapPickerPickup(): GmCoordinate {
    if (this.activeAddressField === 'pickup' && this.pendingMapSelection?.coordinate) {
      return this.pendingMapSelection.coordinate;
    }
    return this.pickupCoordinate;
  }

  get mapPickerDropoff(): GmCoordinate {
    if (this.activeAddressField === 'dropoff' && this.pendingMapSelection?.coordinate) {
      return this.pendingMapSelection.coordinate;
    }
    return this.dropoffCoordinate;
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

  private _cachedStopCoordinates: GmCoordinate[] = [];
  private _cachedStopIndexes: number[] = [];
  private _lastStopCoordinatesKey = '';

  private updateStopCoordinatesCache(): void {
    const key = JSON.stringify(this.stopCoordinates);
    if (key === this._lastStopCoordinatesKey) {
      return;
    }
    this._lastStopCoordinatesKey = key;
    this._cachedStopCoordinates = this.stopCoordinates.filter((coordinate): coordinate is GmCoordinate => Boolean(coordinate));
    this._cachedStopIndexes = this.stopCoordinates
      .map((coordinate, index) => (coordinate ? index : null))
      .filter((index): index is number => index !== null);
  }

  get routeStopCoordinates(): GmCoordinate[] {
    this.updateStopCoordinatesCache();
    return this._cachedStopCoordinates;
  }

  get routeStopIndexes(): number[] {
    this.updateStopCoordinatesCache();
    return this._cachedStopIndexes;
  }

  get pendingMapAddress(): string {
    return this.pendingMapSelection?.address?.trim() || 'Chạm bản đồ, tìm địa chỉ hoặc dùng vị trí hiện tại';
  }

  get currentLocationPreview(): string {
    const currentAddress = this.locationService.getCurrent().address?.trim() ?? '';
    if (currentAddress && currentAddress !== 'Chưa xác định vị trí') {
      return currentAddress;
    }

    return this.pickupAddress.trim();
  }

  get mapSearchPlaceholder(): string {
    if (this.activeAddressField === 'pickup') {
      return '';
    }
    if (this.activeAddressField === 'dropoff') {
      return this.stopAddresses.length ? 'Điểm cuối' : 'Đến';
    }
    return 'Điểm dừng';
  }

  get mapSearchHistoryItems(): GmLocationSearchHistoryItem[] {
    const historyItems = this.confirmedAddressHistory.map((item) => ({
      id: item.id,
      address: item.address,
      coordinate: item.coordinate,
      detailsText: [item.details.contactName, item.details.phone, item.details.note].filter(Boolean).join(' · '),
      data: item,
    }));

    const routeItems = this.confirmedLocationResults.map((item) => ({
      id: this.createConfirmedAddressHistoryId(item),
      address: item.address,
      coordinate: item.coordinate,
    }));

    return [
      ...historyItems,
      ...routeItems.filter(
        (routeItem) =>
          !historyItems.some(
            (historyItem) => historyItem.id === routeItem.id || historyItem.address.trim() === routeItem.address.trim(),
          ),
      ),
    ].slice(0, 8);
  }

  get mapDetailsRequired(): boolean {
    return this.activeAddressField !== 'pickup';
  }

  get mapDetailsComplete(): boolean {
    if (!this.mapDetailsRequired) {
      return true;
    }

    return Boolean(this.mapAddressDetails.contactName.trim() && this.mapAddressDetails.phone.trim());
  }

  getSavedAddressDetailsTextForPicker = (address: GmCustomerAddress): string => {
    const details = this.customerAddressService.getAddressDetails(address);
    return [details.contactName, details.phone, details.note].filter(Boolean).join(' · ');
  };

  get confirmedLocationResults(): GmAddressSearchResult[] {
    const locations: GmAddressSearchResult[] = [];
    this.addConfirmedLocation(locations, this.pickupAddress, this.pickupCoordinate);
    this.stopAddresses.forEach((address, index) => this.addConfirmedLocation(locations, address, this.stopCoordinates[index]));
    this.addConfirmedLocation(locations, this.dropoffAddress, this.dropoffCoordinate);
    return locations;
  }

  get estimateDistanceKm(): number {
    return this.estimateDistanceFor(this.type, this.vehicleType) + this.routeDetourKm;
  }

  get estimateDurationMin(): number {
    return this.estimateDurationFor(this.type, this.vehicleType) + Math.ceil(this.routeDetourKm * 3.6);
  }

  get routeDetourKm(): number {
    const points = this.orderedRoutePoints;
    if (points.length < 4) {
      return 0;
    }

    const start = points[0];
    const end = points[points.length - 1];
    const waypoints = points.slice(1, points.length - 1);

    const currentDistance = this.routeTotalDistance(points);
    const optimalDistance = this.optimalRouteDistance(start, end, waypoints);
    const detour = currentDistance - optimalDistance;
    return detour > 0.1 ? Math.round(detour * 10) / 10 : 0;
  }

  get hasRouteDetourFee(): boolean {
    return this.routeDetourKm > 0;
  }

  private get orderedRoutePoints(): GmCoordinate[] {
    const points: GmCoordinate[] = [];
    if (this.pickupCoordinate) {
      points.push(this.pickupCoordinate);
    }
    this.stopCoordinates.forEach((coordinate) => {
      if (coordinate) {
        points.push(coordinate);
      }
    });
    if (this.dropoffCoordinate) {
      points.push(this.dropoffCoordinate);
    }
    return points;
  }

  private routeTotalDistance(points: GmCoordinate[]): number {
    let total = 0;
    for (let i = 0; i < points.length - 1; i += 1) {
      total += this.haversineKm(points[i], points[i + 1]);
    }
    return total;
  }

  private optimalRouteDistance(start: GmCoordinate, end: GmCoordinate, waypoints: GmCoordinate[]): number {
    if (!waypoints.length) {
      return this.haversineKm(start, end);
    }

    let best = Number.POSITIVE_INFINITY;
    const permute = (remaining: GmCoordinate[], ordered: GmCoordinate[]): void => {
      if (!remaining.length) {
        best = Math.min(best, this.routeTotalDistance([start, ...ordered, end]));
        return;
      }
      for (let i = 0; i < remaining.length; i += 1) {
        const next = remaining[i];
        const rest = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
        permute(rest, [...ordered, next]);
      }
    };

    if (waypoints.length <= 6) {
      permute(waypoints, []);
      return best;
    }
    return this.nearestNeighborDistance(start, end, waypoints);
  }

  private nearestNeighborDistance(start: GmCoordinate, end: GmCoordinate, waypoints: GmCoordinate[]): number {
    const remaining = [...waypoints];
    const ordered: GmCoordinate[] = [];
    let current = start;
    while (remaining.length) {
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      remaining.forEach((point, index) => {
        const distance = this.haversineKm(current, point);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      current = remaining[nearestIndex];
      ordered.push(current);
      remaining.splice(nearestIndex, 1);
    }
    return this.routeTotalDistance([start, ...ordered, end]);
  }

  private haversineKm(from: GmCoordinate, to: GmCoordinate): number {
    const earthRadiusKm = 6371;
    const toRad = (value: number): number => (value * Math.PI) / 180;
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
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

  getVehicleEstimatePrice(vehicleId: GmVehicleType): number {
    const estimate = calculateGapMovePrice({
      type: this.type,
      vehicleType: vehicleId,
      distanceKm: this.estimateDistanceFor(this.type, vehicleId),
      durationMin: this.estimateDurationFor(this.type, vehicleId),
      voucherDiscount: this.promoCode.trim() ? 10000 : 0,
      porterOptions: this.porterOptions,
      additionalServiceCount: this.selectedAdditionalServices.filter((item) => item !== 'porter').length,
    });
    return estimate.finalAmount;
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
    this.pendingDeliveryServiceId = type;

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

  toggleAdditionalServiceById(id: GmAdditionalServiceKey): void {
    const option = this.additionalServiceOptions.find((o) => o.id === id);
    if (option) {
      this.toggleAdditionalService(option);
    }
  }

  isAdditionalSelected(serviceId: GmAdditionalServiceKey): boolean {
    return this.selectedAdditionalServices.includes(serviceId);
  }

  addStop(): void {
    this.stopAddresses = [...this.stopAddresses, ''];
    this.stopCoordinates = [...this.stopCoordinates, undefined];
    this.stopSuggestions = [...this.stopSuggestions, []];
  }

  removeStop(index: number): void {
    clearTimeout(this.stopSearchTimers[index]);
    this.stopAddresses = this.stopAddresses.filter((_, itemIndex) => itemIndex !== index);
    this.stopCoordinates = this.stopCoordinates.filter((_, itemIndex) => itemIndex !== index);
    this.stopSuggestions = this.stopSuggestions.filter((_, itemIndex) => itemIndex !== index);
    this.stopSearchTimers = this.stopSearchTimers.filter((_, itemIndex) => itemIndex !== index);
    if (!this.stopAddresses.length) {
      this.isRouteReorderMode = false;
    }
  }

  toggleRouteReorder(): void {
    if (!this.stopAddresses.length) {
      return;
    }

    this.isRouteReorderMode = !this.isRouteReorderMode;
  }

  moveDestinationPoint(change: GmBookingDestinationPointMove): void {
    const points = this.getDestinationPointStates();
    const { fromIndex, toIndex } = change;
    if (!points.length || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= points.length || toIndex >= points.length) {
      return;
    }

    const [movedPoint] = points.splice(fromIndex, 1);
    points.splice(toIndex, 0, movedPoint);
    this.applyDestinationPointStates(points);
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

  openPaymentSheet(): void {
    this.isPaymentSheetOpen = true;
  }

  closePaymentSheet(): void {
    this.isPaymentSheetOpen = false;
  }

  selectCashPayer(payer: 'sender' | 'receiver'): void {
    this.paymentMethod = 'cash';
    this.receiverPays = payer === 'receiver';
  }

  selectEgreenPayment(): void {
    this.paymentMethod = 'wallet';
    this.receiverPays = false;
  }

  openPromoSheet(): void {
    this.isPromoSheetOpen = true;
  }

  closePromoSheet(): void {
    this.isPromoSheetOpen = false;
  }

  selectPromoOffer(offer: GmPromoOffer): void {
    if (offer.disabled) {
      return;
    }

    this.selectedPromoId = offer.id;
    this.promoCode = offer.id;
    this.closePromoSheet();
  }

  skipPromoAndContinue(): void {
    this.selectedPromoId = '';
    this.promoCode = '';
    this.closePromoSheet();
  }

  applyPromoAndContinue(): void {
    const code = this.promoCode.trim().toUpperCase();
    if (!code) {
      this.skipPromoAndContinue();
      return;
    }

    this.promoCode = code;
    this.selectedPromoId = this.promoOffers.some((offer) => offer.id === code) ? code : '';
    this.closePromoSheet();
  }

  openScheduleSheet(): void {
    if (!this.scheduledAt) {
      this.scheduledAt = this.getDefaultScheduledAt();
    }
    this.isScheduleSheetOpen = true;
  }

  closeScheduleSheet(): void {
    this.isScheduleSheetOpen = false;
  }

  onChildModalStateChange(isActive: boolean): void {
    this.isChildModalActive = isActive;
  }

  openInvoiceInfo(): void {
    this.toastService.info('Tính năng xuất hóa đơn VAT đang được phát triển!');
  }

  confirmScheduleBooking(): void {
    this.scheduleMode = 'scheduled';
    if (!this.scheduledAt) {
      this.scheduledAt = this.getDefaultScheduledAt();
    }
    this.closeScheduleSheet();
  }

  selectDeliveryOption(option: GmDeliveryServiceOption): void {
    this.selectService(option.id);
    if (option.vehicleType) {
      this.vehicleType = option.vehicleType;
    }
  }

  openDeliveryServiceSheet(): void {
    this.pendingDeliveryServiceId = this.type;
    this.pendingVehicleType = this.vehicleType;
    this.isDeliveryServiceSheetOpen = true;
  }

  closeDeliveryServiceSheet(): void {
    this.isDeliveryServiceSheetOpen = false;
  }

  selectPendingDeliveryService(service: GmDeliveryServiceOption): void {
    this.pendingDeliveryServiceId = service.id;
    if (service.vehicleType) {
      this.pendingVehicleType = service.vehicleType;
    }
  }

  confirmDeliveryServiceSelection(): void {
    const selectedService = this.deliveryServiceOptions.find(
      (service) => service.id === this.pendingDeliveryServiceId &&
                   (!service.vehicleType || service.vehicleType === this.pendingVehicleType)
    );
    this.closeDeliveryServiceSheet();

    if (selectedService) {
      this.selectDeliveryOption(selectedService);
    }
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

  searchStopAddress(index: number): void {
    const query = this.stopAddresses[index] ?? '';
    if (query.trim().length < 2) {
      this.stopSuggestions[index] = [];
      return;
    }

    this.geocodingService.searchAddress(query).subscribe((results) => {
      this.stopSuggestions[index] = results.slice(0, 4);
    });
  }

  usePickupSuggestion(result: GmAddressSearchResult): void {
    this.useAddressSuggestion({ field: 'pickup', result });
  }

  useDropoffSuggestion(result: GmAddressSearchResult): void {
    this.useAddressSuggestion({ field: 'dropoff', result });
  }

  useAddressSuggestion(selection: GmBookingSuggestionSelection): void {
    this.geocodingService.resolveAddress(selection.result).subscribe((resolved) => {
      this.openMapPickerWithSelection(selection, resolved);
      this.clearSuggestions(selection);
    });
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

  updateStopAddress(change: GmBookingStopAddressChange): void {
    this.stopAddresses[change.index] = change.address;
  }

  updatePackageInfo(value: string): void {
    this.packageInfo = value;
  }

  updateWeightKg(value: unknown): void {
    this.weightKg = this.toNonNegativeNumber(value);
  }

  updateLengthCm(value: unknown): void {
    this.lengthCm = this.toNonNegativeNumber(value);
  }

  updateWidthCm(value: unknown): void {
    this.widthCm = this.toNonNegativeNumber(value);
  }

  updateHeightCm(value: unknown): void {
    this.heightCm = this.toNonNegativeNumber(value);
  }

  onStopAddressInput(index: number): void {
    clearTimeout(this.stopSearchTimers[index]);
    this.stopSearchTimers[index] = setTimeout(() => this.searchStopAddress(index), 250);
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.pickupAddress = '';
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
        this.pickupAddress = '';
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 },
    );
  }

  openMapPicker(field: GmBookingAddressField, stopIndex: number | null = null): void {
    this.activeAddressField = field;
    this.activeStopIndex = field === 'stop' ? stopIndex ?? this.activeStopIndex ?? 0 : null;
    const currentCoordinate = this.getCurrentCoordinate(field, this.activeStopIndex);
    const currentAddress = this.getCurrentAddress(field, this.activeStopIndex);
    this.pendingMapSelection = {
      address: currentAddress,
      coordinate: currentCoordinate,
    };
    this.mapSearchQuery = currentAddress;
    this.mapSearchResults = [];
    this.isMapPickerMapOpen = false;
    this.isMapPickerSavedAddressesOpen = false;
    this.mapAddressDetails = {
      unit: '',
      phone: field === 'pickup' ? this.senderPhone : this.receiverPhone,
      contactName: field === 'pickup' ? this.senderName : this.receiverName,
      note: this.note,
      saveAddress: false,
    };
    this.isMapPickerOpen = true;
  }

  openMapPickerTarget(target: GmBookingAddressTarget): void {
    this.openMapPicker(target.field, target.stopIndex ?? null);
  }

  openMapPickerWithSelection(target: GmBookingAddressTarget, selection: GmAddressSearchResult): void {
    this.activeAddressField = target.field;
    this.activeStopIndex = target.field === 'stop' ? target.stopIndex ?? 0 : null;
    this.pendingMapSelection = selection;
    this.mapSearchQuery = selection.address;
    this.mapSearchResults = [];
    this.isMapPickerMapOpen = true;
    this.isMapPickerSavedAddressesOpen = false;
    this.isMapPickerOpen = true;
  }

  closeMapPicker(): void {
    this.isMapPickerOpen = false;
    this.isMapPickerMapOpen = false;
    this.isMapPickerSavedAddressesOpen = false;
    this.mapSearchResults = [];
    this.pendingMapSelection = undefined;
    this.activeStopIndex = null;
  }

  openMapPickerMapMode(): void {
    this.isMapPickerMapOpen = true;
    this.isMapPickerSavedAddressesOpen = false;
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

  useLocationSearchResult(result: GmAddressSearchResult): void {
    this.useMapSearchResult(result);
    this.openMapPickerMapMode();
  }

  useMapSearchHistoryItem(item: GmLocationSearchHistoryItem): void {
    const historyItem = item.data as GmBookingConfirmedAddressHistoryItem | undefined;

    if (historyItem?.details) {
      this.mapAddressDetails = {
        ...historyItem.details,
        saveAddress: false,
      };
    }

    this.useLocationSearchResult({
      address: historyItem?.address ?? item.address,
      coordinate: historyItem?.coordinate ?? item.coordinate,
    });
  }

  toggleMapPickerSavedAddresses(): void {
    this.isMapPickerSavedAddressesOpen = !this.isMapPickerSavedAddressesOpen;
  }

  selectMapSearchResult(result: GmAddressSearchResult): void {
    this.geocodingService.resolveAddress(result).subscribe((resolved) => {
      this.pendingMapSelection = resolved;
      this.mapSearchQuery = resolved.address;
      this.mapSearchResults = [];
    });
  }

  selectMapSavedAddress(address: GmCustomerAddress): void {
    const details = this.customerAddressService.getAddressDetails(address);
    const selection = {
      address: address.address,
      coordinate: this.customerAddressService.toCoordinate(address),
    };
    this.mapAddressDetails = {
      unit: details.unit,
      phone: details.phone,
      contactName: details.contactName,
      note: details.note,
      saveAddress: false,
    };
    this.applyActiveAddressSelection(selection);
    this.applySavedAddressContactDetails(details);
    this.rememberConfirmedAddressHistory(selection);
    this.closeMapPicker();
  }

  selectCurrentMapLocation(): void {
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
          address: 'Vị trí hiện tại',
        };

        this.geocodingService.reverseGeocode(coordinate.lat, coordinate.lng).subscribe({
          next: (result) => {
            this.isLocating = false;
            const selection = result ?? { address: 'Vị trí hiện tại', coordinate };
            this.pendingMapSelection = selection;
            this.mapSearchQuery = selection.address;
            this.mapSearchResults = [];
          },
          error: () => {
            this.isLocating = false;
            const selection = { address: 'Vị trí hiện tại', coordinate };
            this.pendingMapSelection = selection;
            this.mapSearchQuery = selection.address;
            this.mapSearchResults = [];
          },
        });
      },
      () => {
        this.isLocating = false;
        this.toastService.error('Không lấy được vị trí hiện tại');
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 },
    );
  }

  async useContactBookForMapDetails(): Promise<void> {
    const contacts = (navigator as Navigator & {
      contacts?: {
        select(properties: string[], options?: { multiple?: boolean }): Promise<Array<{ name?: string[]; tel?: string[] }>>;
      };
    }).contacts;
    if (!contacts?.select) {
      return;
    }

    try {
      const selected = await contacts.select(['name', 'tel'], { multiple: false });
      const contact = selected[0];
      if (!contact) {
        return;
      }

      this.mapAddressDetails = {
        ...this.mapAddressDetails,
        contactName: contact.name?.[0]?.trim() || this.mapAddressDetails.contactName,
        phone: contact.tel?.[0]?.trim() || this.mapAddressDetails.phone,
      };
    } catch {
      return;
    }
  }

  useMyInfoForMapDetails(): void {
    this.mapAddressDetails = {
      ...this.mapAddressDetails,
      contactName: this.user?.fullName?.trim() || this.mapAddressDetails.contactName,
      phone: this.user?.phone?.trim() || this.mapAddressDetails.phone,
    };
  }

  handleMapMarkerDrag(event: GmMapMarkerDragEvent): void {
    if (this.isMapPickerOpen && this.isActiveDragTarget(event)) {
      this.useMapCoordinate(event.coordinate);
      return;
    }

    this.applyDraggedRouteCoordinate(event);
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

    this.geocodingService.resolveAddress(this.pendingMapSelection).subscribe((resolved) => {
      this.applyActiveAddressSelection(resolved);
      this.applyMapAddressDetails(resolved);
      this.rememberConfirmedAddressHistory(resolved);
      this.closeMapPicker();
    });
  }

  handleSavedAddressSelection(selection: GmBookingSavedAddressSelection): void {
    const result: GmAddressSearchResult = {
      address: selection.address.address,
      coordinate: this.customerAddressService.toCoordinate(selection.address),
    };
    this.openMapPickerWithSelection(selection, result);
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
      bagac: 'gm-vehicle-sprite-bagac',
      van: 'gm-vehicle-sprite-van',
      truck: 'gm-vehicle-sprite-truck',
    };
    return map[vehicleType];
  }

  drawerSpriteClass(item: GmBookingDrawerItem): string {
    const service = item.type ? this.services.find((option) => option.id === item.type) : undefined;
    return service ? this.serviceSpriteClass(service) : '';
  }

  get bookingValidationError(): string | null {
    if (!this.pickupAddress.trim()) {
      return this.type === 'porter' ? 'Vui lòng chọn điểm bê hàng' : 'Vui lòng chọn điểm lấy/đón hàng';
    }
    if (!this.dropoffAddress.trim()) {
      return this.type === 'porter' ? 'Vui lòng chọn điểm hoàn tất' : 'Vui lòng chọn điểm giao/đến';
    }
    if (this.type !== 'ride' && this.type !== 'porter') {
      if (!this.packageInfo.trim()) {
        return 'Vui lòng chọn loại hàng hoá';
      }
    }
    if (this.scheduleMode === 'scheduled' && !this.scheduledAt) {
      return 'Vui lòng chọn thời gian hẹn giờ';
    }
    return null;
  }

  get canSubmitBooking(): boolean {
    return this.bookingValidationError === null;
  }

  get confirmTotalLabel(): string {
    return this.formatAmount(this.priceEstimate.finalAmount);
  }

  submit(): void {
    const error = this.bookingValidationError;
    if (error) {
      this.toastService.error(error);
      return;
    }
    this.openConfirmSheet();
  }

  openConfirmSheet(): void {
    this.isConfirmSheetOpen = true;
  }

  closeConfirmSheet(): void {
    this.isConfirmSheetOpen = false;
  }

  confirmPlaceOrder(): void {
    if (this.bookingValidationError) {
      this.toastService.error(this.bookingValidationError);
      return;
    }
    this.closeConfirmSheet();
    this.placeOrder();
  }

  private placeOrder(): void {
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
          .map((address, index) => ({ address, coordinate: this.stopCoordinates[index] }))
          .filter((stop) => stop.address.trim())
          .map((stop, index) => ({
            id: `stop-${index + 1}`,
            label: `Điểm dừng ${index + 1}`,
            address: stop.address,
            coordinate: stop.coordinate ?? {
              lat: this.pickupCoordinate.lat + (index + 1) * 0.01,
              lng: this.pickupCoordinate.lng + (index + 1) * 0.01,
              address: stop.address,
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

  private getServiceEstimate(service: GmServiceOption): number {
    const price = calculateGapMovePrice({
      type: service.id,
      vehicleType: service.vehicleType,
      distanceKm: this.estimateDistanceFor(service.id, service.vehicleType),
      durationMin: this.estimateDurationFor(service.id, service.vehicleType),
      voucherDiscount: this.promoCode.trim() ? 10000 : 0,
      porterOptions: service.id === 'porter' || service.id === 'moving' ? this.porterOptions : undefined,
      additionalServiceCount: this.selectedAdditionalServices.filter((item) => item !== 'porter').length,
    });

    return price.finalAmount;
  }

  private estimateDistanceFor(type: GmBookingType, vehicleType: GmVehicleType): number {
    if (type === 'porter') {
      return 0;
    }
    if (vehicleType === 'truck') {
      return 12.8;
    }
    if (vehicleType === 'bagac') {
      return 9.5;
    }
    if (vehicleType === 'van') {
      return 8.6;
    }
    return 6.4;
  }

  private estimateDurationFor(type: GmBookingType, vehicleType: GmVehicleType): number {
    if (type === 'porter') {
      return Math.max(30, this.porterOptions.helperCount * 20 + this.porterOptions.floorCount * 8);
    }

    return Math.ceil(this.estimateDistanceFor(type, vehicleType) * 3.6);
  }

  private toNonNegativeNumber(value: unknown): number {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
  }

  private addConfirmedLocation(locations: GmAddressSearchResult[], address: string, coordinate?: GmCoordinate): void {
    const normalizedAddress = address.trim();
    if (
      !normalizedAddress ||
      this.isPlaceholderAddress(normalizedAddress) ||
      locations.some((location) => location.address === normalizedAddress)
    ) {
      return;
    }

    locations.push({
      address: normalizedAddress,
      coordinate: coordinate ? { ...coordinate, address: coordinate.address ?? normalizedAddress } : undefined,
    });
  }

  private isPlaceholderAddress(address: string): boolean {
    const normalized = address.trim().toLowerCase();
    return normalized === 'nhập điểm lấy' || normalized === 'nhap diem lay';
  }

  private applyActiveAddressSelection(result: GmAddressSearchResult): void {
    if (this.activeAddressField === 'pickup') {
      this.applyPickup(result);
      return;
    }

    if (this.activeAddressField === 'dropoff') {
      this.applyDropoff(result);
      return;
    }

    if (this.activeStopIndex !== null) {
      this.applyStop(this.activeStopIndex, result);
    }
  }

  private getDefaultScheduledAt(): string {
    const scheduledAt = new Date();
    scheduledAt.setHours(scheduledAt.getHours() + 1, 0, 0, 0);
    return this.toDateTimeLocal(scheduledAt);
  }

  private toDateTimeLocal(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  private formatScheduleLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Đặt lịch';
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const isSameDay = (left: Date, right: Date): boolean =>
      left.getDate() === right.getDate() &&
      left.getMonth() === right.getMonth() &&
      left.getFullYear() === right.getFullYear();

    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    if (isSameDay(date, today)) {
      return `Hôm nay, ${time}`;
    }
    if (isSameDay(date, tomorrow)) {
      return `Ngày mai, ${time}`;
    }

    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}, ${time}`;
  }

  private applyMapAddressDetails(result: GmAddressSearchResult): void {
    if (!this.mapDetailsRequired) {
      return;
    }

    this.receiverName = this.mapAddressDetails.contactName.trim();
    this.receiverPhone = this.mapAddressDetails.phone.trim();
    if (this.mapAddressDetails.note.trim()) {
      this.note = this.mapAddressDetails.note.trim();
    }

    if (this.mapAddressDetails.saveAddress && result.coordinate) {
      this.customerAddressService
        .createAddress({
          label: this.receiverName || 'Địa chỉ',
          address: result.address,
          lat: result.coordinate.lat,
          lng: result.coordinate.lng,
          phone: this.receiverPhone,
          contactName: this.receiverName,
          contact_name: this.receiverName,
          note: this.note,
        })
        .subscribe({
          next: () => this.loadSavedAddresses(),
          error: () => undefined,
        });
    }
  }

  private applySavedAddressContactDetails(details: { phone: string; contactName: string; note: string }): void {
    if (this.activeAddressField === 'pickup') {
      this.senderName = details.contactName || this.senderName;
      this.senderPhone = details.phone || this.senderPhone;
      return;
    }

    this.receiverName = details.contactName || this.receiverName;
    this.receiverPhone = details.phone || this.receiverPhone;
    this.note = details.note || this.note;
  }

  private rememberConfirmedAddressHistory(result: GmAddressSearchResult): void {
    if (!result.coordinate || this.isPlaceholderAddress(result.address)) {
      return;
    }

    const item: GmBookingConfirmedAddressHistoryItem = {
      id: this.createConfirmedAddressHistoryId(result),
      address: result.address,
      coordinate: {
        ...result.coordinate,
        address: result.address,
      },
      details: {
        unit: '',
        phone: this.mapAddressDetails.phone.trim(),
        contactName: this.mapAddressDetails.contactName.trim(),
        note: this.mapAddressDetails.note.trim(),
        saveAddress: false,
      },
      confirmedAt: Date.now(),
    };

    this.confirmedAddressHistory = [
      item,
      ...this.confirmedAddressHistory.filter((historyItem) => historyItem.id !== item.id),
    ].slice(0, 8);
    this.writeConfirmedAddressHistory();
  }

  private loadConfirmedAddressHistory(): void {
    if (typeof sessionStorage === 'undefined') {
      this.confirmedAddressHistory = [];
      return;
    }

    try {
      const items = JSON.parse(
        sessionStorage.getItem(GM_STORAGE_KEYS.confirmedAddressHistory) ?? '[]',
      ) as GmBookingConfirmedAddressHistoryItem[];
      this.confirmedAddressHistory = items
        .filter((item) => Boolean(item.address && item.coordinate) && !this.isPlaceholderAddress(item.address))
        .map((item) => ({
          ...item,
          details: {
            unit: '',
            phone: item.details?.phone ?? '',
            contactName: item.details?.contactName ?? '',
            note: item.details?.note ?? '',
            saveAddress: false,
          },
        }));
    } catch {
      this.confirmedAddressHistory = [];
    }
  }

  private writeConfirmedAddressHistory(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.setItem(GM_STORAGE_KEYS.confirmedAddressHistory, JSON.stringify(this.confirmedAddressHistory));
  }

  private createConfirmedAddressHistoryId(result: GmAddressSearchResult): string {
    const lat = result.coordinate?.lat ?? 0;
    const lng = result.coordinate?.lng ?? 0;
    return `${result.address.trim().toLowerCase()}|${Number(lat).toFixed(6)}|${Number(lng).toFixed(6)}`;
  }

  private buildNote(): string {
    const noteParts = [
      this.note.trim(),
      this.senderName.trim() ? `Người gửi: ${this.senderName.trim()}` : '',
      this.senderPhone.trim() ? `SĐT người gửi: ${this.senderPhone.trim()}` : '',
      this.receiverName.trim() ? `Người nhận: ${this.receiverName.trim()}` : '',
      this.receiverPhone.trim() ? `SĐT người nhận: ${this.receiverPhone.trim()}` : '',
      this.receiverPays ? 'Người nhận trả tiền' : 'Người gửi trả tiền',
      this.codAmount > 0 ? `COD: ${this.codAmount}` : '',
      this.declaredValue > 0 ? `Giá trị khai báo: ${this.declaredValue}` : '',
      this.itemCount > 0 ? `Số kiện: ${this.itemCount}` : '',
      this.weightKg > 0 ? `Khối lượng: ${this.weightKg}kg` : '',
      this.lengthCm > 0 || this.widthCm > 0 || this.heightCm > 0 ? `Kích thước: ${this.lengthCm}x${this.widthCm}x${this.heightCm}cm` : '',
      this.trackingCode.trim() ? `Mã vận đơn: ${this.trackingCode.trim()}` : '',
    ].filter(Boolean);

    return noteParts.join(' | ');
  }

  checkAndOpenServiceSheet(): void {
    if (this.hasRouteLocations && !this.isDeliveryServiceSheetOpen && !this.serviceSheetAutoOpened) {
      this.serviceSheetAutoOpened = true;
      this.openDeliveryServiceSheet();
    }
  }

  private applyPickup(result: GmAddressSearchResult): void {
    this.pickupAddress = result.address;
    if (result.coordinate) {
      this.pickupCoordinate = result.coordinate;
      this.locationService.updateLocation(result.coordinate);
    }
    this.checkAndOpenServiceSheet();
  }

  private applyDropoff(result: GmAddressSearchResult): void {
    this.dropoffAddress = result.address;
    if (result.coordinate) {
      this.dropoffCoordinate = result.coordinate;
    }
    this.checkAndOpenServiceSheet();
  }

  private applyStop(index: number, result: GmAddressSearchResult): void {
    this.stopAddresses[index] = result.address;
    if (result.coordinate) {
      this.stopCoordinates[index] = result.coordinate;
    }
    this.stopSuggestions[index] = [];
  }

  private getDestinationPointStates(): GmBookingRoutePointState[] {
    const stops = this.stopAddresses.map((address, index) => ({
      address,
      coordinate: this.stopCoordinates[index],
      suggestions: this.stopSuggestions[index] ?? [],
    }));

    return [
      ...stops,
      {
        address: this.dropoffAddress,
        coordinate: this.dropoffCoordinate,
        suggestions: this.dropoffSuggestions,
      },
    ];
  }

  private applyDestinationPointStates(points: GmBookingRoutePointState[]): void {
    const nextDropoff = points[points.length - 1];
    const nextStops = points.slice(0, -1);

    this.stopAddresses = nextStops.map((point) => point.address);
    this.stopCoordinates = nextStops.map((point) => point.coordinate);
    this.stopSuggestions = nextStops.map((point) => point.suggestions);
    this.stopSearchTimers = this.stopAddresses.map(() => undefined);

    this.dropoffAddress = nextDropoff?.address ?? '';
    this.dropoffCoordinate =
      nextDropoff?.coordinate ?? {
        lat: this.pickupCoordinate.lat + 0.02,
        lng: this.pickupCoordinate.lng + 0.02,
        address: nextDropoff?.address || 'Điểm giao / đến',
      };
    this.dropoffSuggestions = nextDropoff?.suggestions ?? [];
  }

  private applyDraggedRouteCoordinate(event: GmMapMarkerDragEvent): void {
    const fallback: GmAddressSearchResult = {
      address: event.coordinate.address || 'Vị trí đã chọn trên bản đồ',
      coordinate: event.coordinate,
    };

    this.geocodingService.reverseGeocode(event.coordinate.lat, event.coordinate.lng).subscribe((result) => {
      const resolved = result ?? fallback;
      if (event.kind === 'pickup') {
        this.applyPickup(resolved);
      } else if (event.kind === 'dropoff') {
        this.applyDropoff(resolved);
      } else if (typeof event.index === 'number') {
        this.applyStop(event.index, resolved);
      }
    });
  }

  private getCurrentAddress(field: GmBookingAddressField, stopIndex: number | null): string {
    if (field === 'pickup') {
      return this.pickupAddress;
    }
    if (field === 'dropoff') {
      return this.dropoffAddress;
    }
    return stopIndex !== null ? this.stopAddresses[stopIndex] ?? '' : '';
  }

  private getCurrentCoordinate(field: GmBookingAddressField, stopIndex: number | null): GmCoordinate {
    if (field === 'pickup') {
      return this.pickupCoordinate;
    }
    if (field === 'dropoff') {
      return this.dropoffCoordinate;
    }

    const stopCoordinate = stopIndex !== null ? this.stopCoordinates[stopIndex] : undefined;
    return (
      stopCoordinate ?? {
        lat: this.dropoffCoordinate.lat,
        lng: this.dropoffCoordinate.lng,
        address: stopIndex !== null ? this.stopAddresses[stopIndex] || 'Điểm dừng' : 'Điểm dừng',
      }
    );
  }

  private clearSuggestions(target: GmBookingAddressTarget): void {
    if (target.field === 'pickup') {
      this.pickupSuggestions = [];
      return;
    }
    if (target.field === 'dropoff') {
      this.dropoffSuggestions = [];
      return;
    }
    if (typeof target.stopIndex === 'number') {
      this.stopSuggestions[target.stopIndex] = [];
    }
  }

  private isActiveDragTarget(event: GmMapMarkerDragEvent): boolean {
    if (event.kind === 'stop') {
      return this.activeAddressField === 'stop';
    }
    return event.kind === this.activeAddressField;
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

  private getQueryNumber(key: string): number | null {
    const value = this.route.snapshot.queryParamMap.get(key);
    if (value === null) {
      return null;
    }
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  private getQueryStops(): Array<{ address: string; coordinate?: GmCoordinate }> {
    const stops: Array<{ address: string; coordinate?: GmCoordinate }> = [];
    for (let index = 1; index <= 20; index += 1) {
      const value = this.route.snapshot.queryParamMap.get(`stop${index}`);
      if (!value) {
        continue;
      }

      const lat = this.getQueryNumber(`stop${index}Lat`);
      const lng = this.getQueryNumber(`stop${index}Lng`);
      stops.push({
        address: value,
        coordinate:
          lat !== null && lng !== null
            ? {
                lat,
                lng,
                address: value,
              }
            : undefined,
      });
    }

    return stops;
  }

  private parseBookingType(value: unknown): GmBookingType | null {
    return value === 'ride' || value === 'delivery' || value === 'truck' || value === 'moving' || value === 'porter' || value === 'multi_stop'
      ? value
      : null;
  }

  private buildCurrentQuery(type: GmBookingType): Record<string, string> {
    const queryParams: Record<string, string> = {
      type,
      pickup: this.pickupAddress,
      dropoff: this.dropoffAddress,
    };

    if (this.pickupCoordinate) {
      queryParams['pickupLat'] = String(this.pickupCoordinate.lat);
      queryParams['pickupLng'] = String(this.pickupCoordinate.lng);
    }
    if (this.dropoffCoordinate) {
      queryParams['dropoffLat'] = String(this.dropoffCoordinate.lat);
      queryParams['dropoffLng'] = String(this.dropoffCoordinate.lng);
    }
    this.stopAddresses.forEach((address, index) => {
      if (address.trim()) {
        queryParams[`stop${index + 1}`] = address.trim();
        const coordinate = this.stopCoordinates[index];
        if (coordinate) {
          queryParams[`stop${index + 1}Lat`] = String(coordinate.lat);
          queryParams[`stop${index + 1}Lng`] = String(coordinate.lng);
        }
      }
    });
    if (this.scheduleMode === 'scheduled' && this.scheduledAt) {
      queryParams['scheduleMode'] = 'scheduled';
      queryParams['scheduledAt'] = this.scheduledAt;
    }

    return queryParams;
  }

  private isVehicleType(value: unknown): value is GmVehicleType {
    return value === 'motorbike' || value === 'car' || value === 'bagac' || value === 'van' || value === 'truck';
  }
}
