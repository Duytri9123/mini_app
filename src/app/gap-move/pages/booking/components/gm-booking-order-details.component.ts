import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GmBookingType } from '../../../core/interfaces/booking.interface';

@Component({
  selector: 'app-gm-booking-order-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gm-booking-order-details.component.html',
})
export class GmBookingOrderDetailsComponent {
  @Input() type: GmBookingType = 'delivery';
  @Input() packageInfo = '';
  @Input() senderName = '';
  @Input() senderPhone = '';
  @Input() receiverName = '';
  @Input() receiverPhone = '';
  @Input() codAmount = 0;
  @Input() declaredValue = 0;
  @Input() itemCount = 1;
  @Input() weightKg = 0;
  @Input() lengthCm = 0;
  @Input() widthCm = 0;
  @Input() heightCm = 0;
  @Input() trackingCode = '';
  @Input() scheduleMode: 'now' | 'scheduled' = 'now';
  @Input() scheduledAt = '';
  @Input() note = '';

  @Output() packageInfoChange = new EventEmitter<string>();
  @Output() senderNameChange = new EventEmitter<string>();
  @Output() senderPhoneChange = new EventEmitter<string>();
  @Output() receiverNameChange = new EventEmitter<string>();
  @Output() receiverPhoneChange = new EventEmitter<string>();
  @Output() codAmountChange = new EventEmitter<number>();
  @Output() declaredValueChange = new EventEmitter<number>();
  @Output() itemCountChange = new EventEmitter<number>();
  @Output() weightKgChange = new EventEmitter<number>();
  @Output() lengthCmChange = new EventEmitter<number>();
  @Output() widthCmChange = new EventEmitter<number>();
  @Output() heightCmChange = new EventEmitter<number>();
  @Output() trackingCodeChange = new EventEmitter<string>();
  @Output() scheduleModeChange = new EventEmitter<'now' | 'scheduled'>();
  @Output() scheduledAtChange = new EventEmitter<string>();
  @Output() noteChange = new EventEmitter<string>();

  get isCargoOrder(): boolean {
    return this.type !== 'ride';
  }

  setScheduleMode(mode: 'now' | 'scheduled'): void {
    this.scheduleModeChange.emit(mode);
  }
}
