import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { GmBookingType } from '../../../core/interfaces/booking.interface';

interface GmCargoSizeOption {
  id: string;
  description: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

@Component({
  selector: 'app-gm-booking-order-details',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './gm-booking-order-details.component.html',
  styleUrls: ['./gm-booking-order-details.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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

  readonly cargoSizes: GmCargoSizeOption[] = [
    { id: 'S', description: 'Tối đa 25x32x12 cm', lengthCm: 25, widthCm: 32, heightCm: 12 },
    { id: 'M', description: 'Tối đa 40x40x40 cm', lengthCm: 40, widthCm: 40, heightCm: 40 },
    { id: 'L', description: 'Tối đa 50x50x50 cm', lengthCm: 50, widthCm: 50, heightCm: 50 },
    { id: 'XL', description: 'Tối đa 60x60x60 cm', lengthCm: 60, widthCm: 60, heightCm: 60 },
    { id: '2XL', description: 'Tối đa 80x80x80 cm', lengthCm: 80, widthCm: 80, heightCm: 80 },
    { id: '3XL', description: 'Tối đa 100x100x100 cm', lengthCm: 100, widthCm: 100, heightCm: 100 },
  ];

  readonly cargoTypes = [
    'Thời trang',
    'Mỹ phẩm',
    'Thực phẩm khô / đóng gói',
    'Thực phẩm tươi sống',
    'Đồ điện tử',
    'Nội thất',
  ];

  selectedCargoSize = 'S';
  showSizeDetailsModal = false;

  get isCargoOrder(): boolean {
    return this.type !== 'ride';
  }

  get selectedCargoSizeDescription(): string {
    return this.cargoSizes.find((size) => size.id === this.selectedCargoSize)?.description ?? '';
  }

  setScheduleMode(mode: 'now' | 'scheduled'): void {
    this.scheduleModeChange.emit(mode);
  }

  selectCargoSize(size: GmCargoSizeOption): void {
    this.selectedCargoSize = size.id;
    this.lengthCmChange.emit(size.lengthCm);
    this.widthCmChange.emit(size.widthCm);
    this.heightCmChange.emit(size.heightCm);
  }

  selectCargoType(type: string): void {
    this.packageInfoChange.emit(type);
  }
}
