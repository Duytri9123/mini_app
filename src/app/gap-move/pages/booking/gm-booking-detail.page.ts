import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { GmBooking } from '../../core/interfaces/booking.interface';
import { GmBookingService } from '../../core/services/gm-booking.service';
import { GmRouteSummaryComponent } from '../../shared/components/gm-route-summary/gm-route-summary.component';
import { formatVnd } from '../../core/utils/helpers';

@Component({
  selector: 'app-gm-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, GmRouteSummaryComponent],
  templateUrl: './gm-booking-detail.page.html',
})
export class GmBookingDetailPage implements OnInit {
  booking$!: Observable<GmBooking | null>;

  constructor(
    private route: ActivatedRoute,
    private bookingService: GmBookingService,
  ) {}

  ngOnInit(): void {
    this.booking$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        return id ? this.bookingService.getBookingById(id) : of(null);
      }),
    );
  }

  formatAmount(amount: number): string {
    return formatVnd(amount);
  }

  typeLabel(type: GmBooking['type']): string {
    const labels: Record<GmBooking['type'], string> = {
      ride: 'Đặt xe',
      delivery: 'Giao hàng',
      truck: 'Xe tải',
      moving: 'Chuyển nhà',
      porter: 'Bê hộ',
      multi_stop: 'Đa điểm',
    };
    return labels[type];
  }

  statusLabel(status: GmBooking['status']): string {
    const labels: Record<GmBooking['status'], string> = {
      draft: 'Nháp',
      searching: 'Đang tìm tài xế',
      driver_assigned: 'Đã có tài xế',
      picked_up: 'Đã lấy hàng',
      in_progress: 'Đang di chuyển',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return labels[status];
  }

  paymentStatusLabel(status: GmBooking['paymentStatus']): string {
    const labels: Record<GmBooking['paymentStatus'], string> = {
      pending: 'Chờ thanh toán',
      paid: 'Đã thanh toán',
      failed: 'Thất bại',
      refunded: 'Đã hoàn tiền',
    };
    return labels[status];
  }
}
