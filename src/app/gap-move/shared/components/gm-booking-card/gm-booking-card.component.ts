import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { GmBooking } from '../../../core/interfaces/booking.interface';
import { formatVnd } from '../../../core/utils/helpers';

@Component({
  selector: 'app-gm-booking-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './gm-booking-card.component.html',
})
export class GmBookingCardComponent {
  @Input({ required: true }) booking!: GmBooking;
  @Output() openBooking = new EventEmitter<GmBooking>();

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

  statusClass(status: GmBooking['status']): string {
    const classes: Record<GmBooking['status'], string> = {
      draft: 'bg-slate-100 text-slate-600',
      searching: 'bg-amber-50 text-amber-700',
      driver_assigned: 'bg-sky-50 text-sky-700',
      picked_up: 'bg-indigo-50 text-indigo-700',
      in_progress: 'bg-violet-50 text-violet-700',
      completed: 'bg-emerald-50 text-emerald-700',
      cancelled: 'bg-rose-50 text-rose-700',
    };
    return classes[status];
  }
}
