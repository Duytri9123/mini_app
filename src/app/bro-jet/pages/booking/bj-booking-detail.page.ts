import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IonSpinner } from '@ionic/angular/standalone';
import { BjBookingService } from '../../core/services/bj-booking.service';
import { BjIotService, BjWashProgress } from '../../core/services/bj-iot.service';
import { BjWashProgressComponent } from '../../shared/components/bj-wash-progress/bj-wash-progress.component';
import { BjPageHeaderComponent } from '../../shared/components/bj-page-header/bj-page-header.component';
import { BjLoadingSpinnerComponent } from '../../shared/components/bj-loading-spinner/bj-loading-spinner.component';
import { BjErrorStateComponent } from '../../shared/components/bj-error-state/bj-error-state.component';
import { BjToastService } from '../../core/services/bj-toast.service';
import { BjBooking, BookingStatus } from '../../core/interfaces/booking.interface';

@Component({
  selector: 'bj-booking-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BjWashProgressComponent, BjPageHeaderComponent, BjLoadingSpinnerComponent, BjErrorStateComponent, IonSpinner],
  templateUrl: './bj-booking-detail.page.html',
})
export class BjBookingDetailPage implements OnInit, OnDestroy {
  booking: BjBooking | null = null;
  loading = false;
  error = false;

  // Wash progress (IoT)
  washProgress: BjWashProgress | null = null;

  // Cancel
  showCancelModal = false;
  cancelReasonControl = new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5)] });
  cancelling = false;
  cancelError = '';

  private bookingId = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BjBookingService,
    private iotService: BjIotService,
    private toast: BjToastService,
  ) {}

  ngOnInit(): void {
    this.bookingId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.bookingId) {
      this._loadBooking();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.bookingId) {
      this.iotService.closeProgress(this.bookingId);
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get isInProgress(): boolean {
    return this.booking?.status === 'in_progress';
  }

  get isConfirmed(): boolean {
    return this.booking?.status === 'confirmed';
  }

  get statusLabel(): string {
    const labels: Record<BookingStatus, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      in_progress: 'Đang rửa',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      no_show: 'Không đến',
    };
    return this.booking ? labels[this.booking.status] : '';
  }

  get statusClass(): string {
    const classes: Record<BookingStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      no_show: 'bg-gray-100 text-gray-600',
    };
    return this.booking ? classes[this.booking.status] : '';
  }

  get formattedScheduledAt(): string {
    if (!this.booking?.scheduledAt) return '';
    const d = new Date(this.booking.scheduledAt);
    return d.toLocaleString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  get paymentMethodLabel(): string {
    const labels: Record<string, string> = {
      wallet: 'Ví BRO JET',
      vnpay: 'VNPay',
      momo: 'MoMo',
      cash: 'Tiền mặt',
    };
    return labels[this.booking?.paymentMethod ?? ''] ?? '';
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────

  openCancelModal(): void {
    this.showCancelModal = true;
    this.cancelError = '';
    this.cancelReasonControl.reset('');
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancelError = '';
  }

  onCancelBooking(): void {
    if (!this.isConfirmed || this.cancelling) return;
    if (this.cancelReasonControl.invalid) {
      this.cancelReasonControl.markAsTouched();
      return;
    }

    this.cancelling = true;
    this.cancelError = '';

    this.bookingService
      .cancelBooking(this.bookingId, this.cancelReasonControl.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.booking = updated;
          this.cancelling = false;
          this.showCancelModal = false;
          this.toast.success('Hủy lịch thành công.');
        },
        error: () => {
          this.cancelling = false;
          this.toast.error('Không thể hủy lịch. Vui lòng thử lại.');
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/bro-jet/bookings']);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _loadBooking(): void {
    this.loading = true;
    this.error = false;
    this.bookingService
      .getBookingById(this.bookingId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (booking) => {
          this.booking = booking;
          this.loading = false;
          if (booking.status === 'in_progress') {
            this._subscribeToProgress();
          }
        },
        error: () => {
          this.error = true;
          this.loading = false;
        },
      });
  }

  private _subscribeToProgress(): void {
    this.iotService
      .getBookingProgress(this.bookingId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (progress) => {
          this.washProgress = progress;
        },
        error: () => {
          // WebSocket error – progress will stop updating
        },
      });
  }
}
