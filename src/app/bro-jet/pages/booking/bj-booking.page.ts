import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

import { IonSpinner } from '@ionic/angular/standalone';
import { BjStationService, BjTimeSlot } from '../../core/services/bj-station.service';
import { BjVehicleService } from '../../core/services/bj-vehicle.service';
import { BjServiceCardComponent } from '../../shared/components/bj-service-card/bj-service-card.component';
import { BjVehicleCardComponent } from '../../shared/components/bj-vehicle-card/bj-vehicle-card.component';
import { BjPageHeaderComponent } from '../../shared/components/bj-page-header/bj-page-header.component';
import { BjLoadingSpinnerComponent } from '../../shared/components/bj-loading-spinner/bj-loading-spinner.component';
import { BjErrorStateComponent } from '../../shared/components/bj-error-state/bj-error-state.component';
import { BjStation, BjServicePackage } from '../../core/interfaces/station.interface';
import { BjVehicle } from '../../core/interfaces/vehicle.interface';

type BookingStep = 1 | 2 | 3;

@Component({
  selector: 'bj-booking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BjServiceCardComponent, BjVehicleCardComponent, BjPageHeaderComponent, BjLoadingSpinnerComponent, BjErrorStateComponent, IonSpinner],
  templateUrl: './bj-booking.page.html',
  styles: [`
    @keyframes pop-in {
      0% { transform: scale(1); }
      50% { transform: scale(1.015); }
      100% { transform: scale(1); }
    }
    .animate-pop {
      animation: pop-in 150ms ease-out forwards;
    }
  `]
})
export class BjBookingPage implements OnInit, OnDestroy {
  step: BookingStep = 1;

  // Data
  station: BjStation | null = null;
  packages: BjServicePackage[] = [];
  vehicles: BjVehicle[] = [];
  availableSlots: BjTimeSlot[] = [];
  availableBays = 0;

  // Selections
  selectedPackage: BjServicePackage | null = null;
  selectedVehicle: BjVehicle | null = null;
  selectedSlot: BjTimeSlot | null = null;

  // Form controls
  dateControl = new FormControl<string>(this._todayStr());

  // Week days for horizontal picker
  selectedDate = this._todayStr();
  weekDays: { label: string; dayNum: number; month: number; date: string }[] = [];

  // State
  loadingStation = false;
  loadingVehicles = false;
  loadingSlots = false;
  errorStation = false;
  errorVehicles = false;
  errorSlots = false;

  private stationId = '';
  private preselectedPackageId = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stationService: BjStationService,
    private vehicleService: BjVehicleService,
  ) {}

  ngOnInit(): void {
    this.stationId = this.route.snapshot.queryParamMap.get('stationId') ?? '';
    this.preselectedPackageId = this.route.snapshot.queryParamMap.get('packageId') ?? '';

    this._buildWeekDays();

    if (this.stationId) {
      this._initializeBooking();
    }
    this._loadVehicles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Step navigation ────────────────────────────────────────────────────────

  goToStep(step: BookingStep): void {
    this.step = step;
    if (step === 2 && this.selectedPackage) {
      this.loadSlots();
    }
  }

  canProceedStep1(): boolean {
    return this.selectedPackage !== null && this.selectedVehicle !== null;
  }

  canProceedStep2(): boolean {
    return this.selectedSlot !== null;
  }

  onNextStep(): void {
    if (this.step === 1 && this.canProceedStep1()) {
      this.goToStep(2);
    } else if (this.step === 2 && this.canProceedStep2()) {
      this._navigateToConfirm();
    }
  }

  onPrevStep(): void {
    if (this.step > 1) {
      this.step = (this.step - 1) as BookingStep;
    } else {
      this.router.navigate(['/bro-jet/station', this.stationId]);
    }
  }

  // ── Selections ─────────────────────────────────────────────────────────────

  onPackageSelect(pkg: BjServicePackage): void {
    if (this.selectedPackage?.id === pkg.id) {
      this.selectedPackage = null;
    } else {
      this.selectedPackage = pkg;
    }
    // Always clear slot when package changes
    this.selectedSlot = null;
  }

  onVehicleSelect(vehicle: BjVehicle): void {
    this.selectedVehicle = this.selectedVehicle?.id === vehicle.id ? null : vehicle;
  }

  onSlotSelect(slot: BjTimeSlot): void {
    if (!slot.available) return;
    this.selectedSlot = this.selectedSlot?.time === slot.time ? null : slot;
  }

  onDateChange(): void {
    this.selectedSlot = null;
    this.selectedDate = this.dateControl.value ?? this._todayStr();
    if (this.selectedPackage) {
      this.loadSlots();
    }
  }

  onDaySelect(date: string): void {
    this.selectedDate = date;
    this.dateControl.setValue(date);
    this.selectedSlot = null;
    if (this.selectedPackage) {
      this.loadSlots();
    }
  }

  onAddVehicle(): void {
    this.router.navigate(['/bro-jet/vehicles/add']);
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get activePackages(): BjServicePackage[] {
    // If isActive is not defined, assume it's true (for API compatibility)
    return this.packages.filter(p => p.isActive !== false);
  }

  get stepTitle(): string {
    const titles: Record<number, string> = {
      1: 'Chọn dịch vụ',
      2: 'Chọn ngày & giờ',
    };
    return titles[this.step] || 'Đặt lịch';
  }

  get canContinue(): boolean {
    if (this.step === 1) return this.canProceedStep1();
    return this.canProceedStep2();
  }

  get minDate(): string {
    return this._todayStr();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _initializeBooking(): void {
    this.loadingStation = true;
    this.errorStation = false;

    this.stationService
      .getStationById(this.stationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (station) => {
          this.station = station;
          // Retrieve packages from station directly
          this.packages = station.service_packages || (station as any).servicePackages || [];
          this.loadingStation = false;

          // If there is a preselected package, find and select it automatically
          if (this.preselectedPackageId) {
            const found = this.packages.find(p => p.id === this.preselectedPackageId);
            if (found) {
              this.selectedPackage = found;
              this.step = 2; // Move to step 2 automatically if package is found
            }
          }

          // Only load slots if a package is selected or preselected
          if (this.selectedPackage || this.preselectedPackageId) {
            this.loadSlots();
          }
        },
        error: (err) => {
          console.error('Lỗi khi lấy thông tin trạm:', err);
          this.errorStation = true;
          this.loadingStation = false;
          
          // Fallback to cache if API fails
          this.stationService.stations$.pipe(take(1)).subscribe((stations: BjStation[]) => {
            const found = stations.find((s: BjStation) => s.id === this.stationId);
            if (found) {
              this.station = found;
              this.packages = found.service_packages || [];
              this.errorStation = false;
            }
          });
        }
      });
  }

  private _loadVehicles(): void {
    this.loadingVehicles = true;
    this.errorVehicles = false;
    this.vehicleService
      .getVehicles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vehicles) => {
          this.vehicles = vehicles;
          this.loadingVehicles = false;
          // Auto-select default vehicle
          const defaultVehicle = vehicles.find(v => v.isDefault);
          if (defaultVehicle) {
            this.selectedVehicle = defaultVehicle;
          }
        },
        error: () => {
          this.errorVehicles = true;
          this.loadingVehicles = false;
        },
      });
  }

  loadSlots(): void {
    const pkgId = this.selectedPackage?.id || this.preselectedPackageId || undefined;
    if (!this.stationId || !this.dateControl.value || !pkgId) return;
    
    this.loadingSlots = true;
    this.errorSlots = false;
    this.availableSlots = [];
    
    this.stationService
      .getAvailability(this.stationId, this.dateControl.value, pkgId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.availableSlots = res.slots || [];
          
          // Disable past time slots if selected date is today
          if (this._isToday(this.dateControl.value || '')) {
            this.availableSlots = this.availableSlots.map(slot => ({
              ...slot,
              available: slot.available && !this._isPastTime(slot.time)
            }));
          }
          
          this.availableBays = res.availableBays || 0;
          this.loadingSlots = false;
          
          // Refresh packages list from API response if available
          if (res.service_packages && res.service_packages.length > 0) {
            this.packages = res.service_packages;
          } else if (res.servicePackages && res.servicePackages.length > 0) {
            this.packages = res.servicePackages;
          }

          // Handle state when package wasn't matching initially
          if (this.preselectedPackageId && !this.selectedPackage) {
            const found = this.packages.find(p => p.id === this.preselectedPackageId);
            if (found) {
              this.selectedPackage = found;
              this.step = 2;
            }
          }

          // Update selected package details from response if it exists
          if (res.selected_package) {
            this.selectedPackage = res.selected_package;
          } else if (res.selectedPackage) {
            this.selectedPackage = res.selectedPackage;
          }
        },
        error: (err) => {
          this.loadingSlots = false;
          this.errorSlots = true;
          console.error('Error loading slots:', err);
        },
      });
  }

  private _navigateToConfirm(): void {
    if (!this.selectedPackage || !this.selectedVehicle || !this.selectedSlot) return;
    const scheduledAt = `${this.dateControl.value}T${this.selectedSlot.time}:00`;
    this.router.navigate(['/bro-jet/booking/confirm'], {
      state: {
        stationId: this.stationId,
        stationName: this.station?.name ?? '',
        packageId: this.selectedPackage.id,
        packageName: this.selectedPackage.name,
        packagePrice: this.selectedPackage.price,
        packageLoyaltyPoints: 0, // loyaltyPoints removed from API
        vehicleId: this.selectedVehicle.id,
        licensePlate: this.selectedVehicle.licensePlate,
        scheduledAt,
      },
    });
  }

  get todayDay(): number {
    return new Date().getDate();
  }

  private _buildWeekDays(): void {
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const today = new Date();
    this.weekDays = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      this.weekDays.push({
        label: i === 0 ? 'Hôm nay' : dayNames[d.getDay()],
        dayNum: d.getDate(),
        month: d.getMonth() + 1,
        date: dateStr,
      });
    }
  }

  private _todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  private _isToday(dateStr: string): boolean {
    return dateStr === this._todayStr();
  }

  private _isPastTime(timeStr: string): boolean {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return slotTime < now;
  }
}
