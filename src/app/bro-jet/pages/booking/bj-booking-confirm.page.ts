import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IonSpinner } from '@ionic/angular/standalone';
import { BjBookingService } from '../../core/services/bj-booking.service';
import { BjLoyaltyService, BjLoyaltyPoints, BjVoucher, BjVoucherValidation } from '../../core/services/bj-loyalty.service';
import { BjToastService } from '../../core/services/bj-toast.service';
import { PaymentMethod } from '../../core/interfaces/booking.interface';
import { BjPageHeaderComponent } from '../../shared/components/bj-page-header/bj-page-header.component';
import { BjErrorStateComponent } from '../../shared/components/bj-error-state/bj-error-state.component';
import { BjVoucherPickerComponent } from '../../shared/components/bj-voucher-picker/bj-voucher-picker.component';

interface BookingState {
  stationId: string;
  stationName: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  packageLoyaltyPoints: number;
  vehicleId: string;
  licensePlate: string;
  scheduledAt: string;
}

@Component({
  selector: 'bj-booking-confirm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BjPageHeaderComponent, BjErrorStateComponent, IonSpinner, BjVoucherPickerComponent],
  templateUrl: './bj-booking-confirm.page.html',
})
export class BjBookingConfirmPage implements OnInit, OnDestroy {
  // Booking state from navigation
  bookingState: BookingState | null = null;

  // Payment
  selectedPaymentMethod: PaymentMethod = 'cash';
  paymentMethods: { value: PaymentMethod; label: string; icon: string }[] = [
    // { value: 'wallet', label: 'Ví BRO JET', icon: 'wallet' }, // Tạm ẩn - không sử dụng ví BRO JET
    { value: 'vnpay', label: 'VNPay', icon: 'vnpay' },
    { value: 'momo', label: 'MoMo', icon: 'momo' },
    { value: 'cash', label: 'Tiền mặt', icon: 'cash' },
  ];

  // Voucher
  voucherControl = new FormControl<string>('', { nonNullable: true });
  voucherValidation: BjVoucherValidation | null = null;
  voucherLoading = false;
  voucherError = '';
  appliedVoucherDiscount = 0;
  showVoucherPicker = false;

  // QR Payment
  showPaymentQR = false;
  paymentQrUrl: string | null = null;
  private paymentBookingId: string | null = null;
  private paymentPollInterval: any = null;

  // Points
  loyaltyPoints: BjLoyaltyPoints | null = null;
  pointsControl = new FormControl<number>(0, { nonNullable: true, validators: [Validators.min(0)] });
  appliedPointsDiscount = 0;
  usePoints = false;

  // Submission
  submitting = false;
  submitError = '';

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private bookingService: BjBookingService,
    private loyaltyService: BjLoyaltyService,
    private toast: BjToastService,
  ) {}

  ngOnInit(): void {
    // Read state from navigation
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as BookingState | undefined;
    if (state?.stationId) {
      this.bookingState = state;
    } else {
      // Fallback: try history state (when page is refreshed or navigated back)
      const historyState = history.state as BookingState | undefined;
      if (historyState?.stationId) {
        this.bookingState = historyState;
      }
    }

    this._loadLoyaltyPoints();
  }

  ngOnDestroy(): void {
    this._stopPaymentPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Payment method ─────────────────────────────────────────────────────────

  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
  }

  // ── Voucher ────────────────────────────────────────────────────────────────

  applyVoucher(): void {
    const code = this.voucherControl.value.trim();
    if (!code || !this.bookingState) return;

    // Cannot use voucher and points simultaneously
    if (this.usePoints && this.appliedPointsDiscount > 0) {
      this.toast.warning('Không thể dùng voucher và điểm cùng lúc. Vui lòng bỏ chọn đổi điểm trước.');
      return;
    }

    this.voucherLoading = true;
    this.voucherError = '';
    this.voucherValidation = null;

    this.loyaltyService
      .validateVoucher(code, this.bookingState.packagePrice)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.voucherValidation = result;
          this.voucherLoading = false;
          if (result.valid) {
            this.appliedVoucherDiscount = result.discount;
            this.toast.success('Áp dụng mã giảm giá thành công!');
          } else {
            this.voucherError = result.error ?? 'Voucher không hợp lệ';
            this.toast.error(this.voucherError);
            this.appliedVoucherDiscount = 0;
          }
        },
        error: () => {
          this.voucherLoading = false;
          this.toast.error('Không thể kiểm tra voucher. Vui lòng thử lại.');
        },
      });
  }

  removeVoucher(): void {
    this.voucherControl.setValue('');
    this.voucherValidation = null;
    this.voucherError = '';
    this.appliedVoucherDiscount = 0;
  }

  onVoucherPicked(voucher: BjVoucher): void {
    this.showVoucherPicker = false;
    this.voucherControl.setValue(voucher.code);
    this.applyVoucher();
  }

  // ── Points redemption ──────────────────────────────────────────────────────

  toggleUsePoints(): void {
    // Cannot use points and voucher simultaneously
    if (!this.usePoints && this.appliedVoucherDiscount > 0) {
      this.toast.warning('Không thể dùng điểm và voucher cùng lúc. Vui lòng xóa voucher trước.');
      return;
    }
    this.usePoints = !this.usePoints;
    if (!this.usePoints) {
      this.appliedPointsDiscount = 0;
      this.pointsControl.setValue(0);
    }
  }

  applyPoints(): void {
    if (!this.bookingState || !this.loyaltyPoints) return;
    const points = this.pointsControl.value;
    const maxDiscount = Math.floor(this.bookingState.packagePrice * 0.5);
    // 1 point = 1 VND (simplified)
    const discount = Math.min(points, this.loyaltyPoints.available, maxDiscount);
    this.appliedPointsDiscount = discount;
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  get baseAmount(): number {
    return this.bookingState?.packagePrice ?? 0;
  }

  get totalDiscount(): number {
    return this.appliedVoucherDiscount + this.appliedPointsDiscount;
  }

  get finalAmount(): number {
    return Math.max(0, this.baseAmount - this.totalDiscount);
  }

  get formattedScheduledAt(): string {
    if (!this.bookingState?.scheduledAt) return '';
    const d = new Date(this.bookingState.scheduledAt);
    return d.toLocaleString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  get maxRedeemablePoints(): number {
    if (!this.loyaltyPoints || !this.bookingState) return 0;
    const maxFromOrder = Math.floor(this.bookingState.packagePrice * 0.5);
    return Math.min(this.loyaltyPoints.available, maxFromOrder);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  onConfirm(): void {
    if (!this.bookingState || this.submitting) return;

    this.submitting = true;
    this.submitError = '';

    const req = {
      vehicleId: this.bookingState.vehicleId,
      stationId: this.bookingState.stationId,
      packageId: this.bookingState.packageId,
      scheduledAt: this.bookingState.scheduledAt,
      paymentMethod: this.selectedPaymentMethod,
      ...(this.appliedVoucherDiscount > 0 && { voucherCode: this.voucherControl.value }),
      ...(this.usePoints && this.appliedPointsDiscount > 0 && { redeemPoints: this.pointsControl.value }),
    };

    this.bookingService
      .createBooking(req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (booking) => {
          this.submitting = false;
          this.paymentBookingId = booking.id;

          // Thanh toán online (VNPay/MoMo) → hiển thị QR trong app
          if ((this.selectedPaymentMethod === 'vnpay' || this.selectedPaymentMethod === 'momo') && (booking.paymentUrl || booking.qrCodeUrl)) {
            this.paymentQrUrl = booking.qrCodeUrl || booking.paymentUrl || null;
            this.showPaymentQR = true;
            this._startPaymentPolling(booking.id);
            return;
          }

          // Tiền mặt → chuyển đến trang chi tiết booking
          this.router.navigate(['/bro-jet/booking', booking.id]);
        },
        error: () => {
          this.submitting = false;
          this.toast.error('Đặt lịch thất bại. Vui lòng thử lại.');
        },
      });
  }

  closePaymentQR(): void {
    this.showPaymentQR = false;
    this._stopPaymentPolling();
    // Chuyển đến trang chi tiết booking (payment pending)
    if (this.paymentBookingId) {
      this.router.navigate(['/bro-jet/booking', this.paymentBookingId]);
    }
  }

  private _startPaymentPolling(bookingId: string): void {
    // Poll mỗi 3 giây để kiểm tra trạng thái thanh toán
    this.paymentPollInterval = setInterval(() => {
      this.bookingService.getBookingById(bookingId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (booking) => {
            if (booking.paymentStatus === 'paid') {
              this._stopPaymentPolling();
              this.showPaymentQR = false;
              this.toast.success('Thanh toán thành công!');
              this.router.navigate(['/bro-jet/booking', bookingId]);
            }
          },
        });
    }, 3000);
  }

  private _stopPaymentPolling(): void {
    if (this.paymentPollInterval) {
      clearInterval(this.paymentPollInterval);
      this.paymentPollInterval = null;
    }
  }

  goBack(): void {
    this.router.navigate(['/bro-jet/booking/new'], {
      queryParams: {
        stationId: this.bookingState?.stationId,
        packageId: this.bookingState?.packageId,
      },
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _loadLoyaltyPoints(): void {
    this.loyaltyService
      .getPoints()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (pts) => {
          this.loyaltyPoints = pts;
        },
        error: () => {
          // Non-critical, ignore
        },
      });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }
}
