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
}
