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
import { GmMapComponent, GmMapMarkerDragEvent } from '../../shared/components/gm-map/gm-map.component';
import { GmBookingMapPickerComponent } from './components/gm-booking-map-picker.component';
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
    GmBookingMapPickerComponent,
    GmBookingOrderDetailsComponent,
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
  pendingDeliveryServiceId: GmBookingType = this.type;
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
    this.loadSavedAddresses();
    this.selectedDrawerItem = this.drawerGroups[0].items.find((item) => item.type === this.type) ?? this.drawerGroups[0].items[0];
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

  get deliveryServiceOptions(): GmDeliveryServiceOption[] {
    return this.services.map((service) => ({
      id: service.id,
      title: service.title,
      subtitle: service.subtitle,
      spriteClass: this.serviceSpriteClass(service),
      price: this.getServiceEstimate(service),
    }));
  }

  get selectedDeliveryService(): GmDeliveryServiceOption {
    return this.deliveryServiceOptions.find((service) => service.id === this.type) ?? this.deliveryServiceOptions[0];
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

  get routeStopCoordinates(): GmCoordinate[] {
    return this.stopCoordinates.filter((coordinate): coordinate is GmCoordinate => Boolean(coordinate));
  }

  get routeStopIndexes(): number[] {
    return this.stopCoordinates
      .map((coordinate, index) => (coordinate ? index : null))
      .filter((index): index is number => index !== null);
  }

  get pendingMapAddress(): string {
    return this.pendingMapSelection?.address ?? 'Chạm bản đồ, tìm địa chỉ hoặc dùng vị trí hiện tại';
  }

  get estimateDistanceKm(): number {
    return this.estimateDistanceFor(this.type, this.vehicleType);
  }

  get estimateDurationMin(): number {
    return this.estimateDurationFor(this.type, this.vehicleType);
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

  openDeliveryServiceSheet(): void {
    this.pendingDeliveryServiceId = this.type;
    this.isDeliveryServiceSheetOpen = true;
  }

  closeDeliveryServiceSheet(): void {
    this.isDeliveryServiceSheetOpen = false;
  }

  selectPendingDeliveryService(service: GmDeliveryServiceOption): void {
    this.pendingDeliveryServiceId = service.id;
  }

  confirmDeliveryServiceSelection(): void {
    const selectedService = this.deliveryServiceOptions.find((service) => service.id === this.pendingDeliveryServiceId);
    this.closeDeliveryServiceSheet();

    if (selectedService) {
      this.selectService(selectedService.id);
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
      if (this.activeAddressField === 'pickup') {
        this.applyPickup(resolved);
      } else if (this.activeAddressField === 'dropoff') {
        this.applyDropoff(resolved);
      } else if (this.activeStopIndex !== null) {
        this.applyStop(this.activeStopIndex, resolved);
      }

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

  private buildNote(): string {
    const noteParts = [
      this.note.trim(),
      this.senderName.trim() ? `Người gửi: ${this.senderName.trim()}` : '',
      this.senderPhone.trim() ? `SĐT người gửi: ${this.senderPhone.trim()}` : '',
      this.receiverName.trim() ? `Người nhận: ${this.receiverName.trim()}` : '',
      this.receiverPhone.trim() ? `SĐT người nhận: ${this.receiverPhone.trim()}` : '',
      this.codAmount > 0 ? `COD: ${this.codAmount}` : '',
      this.declaredValue > 0 ? `Giá trị khai báo: ${this.declaredValue}` : '',
      this.itemCount > 0 ? `Số kiện: ${this.itemCount}` : '',
      this.weightKg > 0 ? `Khối lượng: ${this.weightKg}kg` : '',
      this.lengthCm > 0 || this.widthCm > 0 || this.heightCm > 0 ? `Kích thước: ${this.lengthCm}x${this.widthCm}x${this.heightCm}cm` : '',
      this.trackingCode.trim() ? `Mã vận đơn: ${this.trackingCode.trim()}` : '',
    ].filter(Boolean);

    return noteParts.join(' | ');
  }

  private applyPickup(result: GmAddressSearchResult): void {
    this.pickupAddress = result.address;
    if (result.coordinate) {
      this.pickupCoordinate = result.coordinate;
      this.locationService.updateLocation(result.coordinate);
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
    return value === 'motorbike' || value === 'car' || value === 'van' || value === 'truck';
  }
}
