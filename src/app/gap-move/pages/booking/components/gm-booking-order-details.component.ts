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
    'Thức ăn / Đồ uống đã chế biến',
    'Nội thất',
    'Thiết bị gia dụng',
    'Mẹ & Bé',
    'Thuốc / Thực phẩm chức năng',
    'Thiết bị điện tử / Công nghệ',
    'Hoa tươi / Cây kiểng',
    'Sách / Văn phòng phẩm',
    'Phụ kiện xe',
    'Đồ thể thao',
  ];

  selectedCargoSize = 'S';
  showSizeDetailsModal = false;
  isCargoTypePickerOpen = false;
  cargoTypeSearchQuery = '';
  pendingCargoTypes: string[] = [];

  @Output() modalStateChange = new EventEmitter<boolean>();

  get isCargoOrder(): boolean {
    return this.type !== 'ride';
  }

  get selectedCargoSizeDescription(): string {
    return this.cargoSizes.find((size) => size.id === this.selectedCargoSize)?.description ?? '';
  }

  get filteredCargoTypes(): string[] {
    const query = this.cargoTypeSearchQuery.trim().toLowerCase();
    if (!query) {
      return this.cargoTypes;
    }

    return this.cargoTypes.filter((type) => type.toLowerCase().includes(query));
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

  openSizeDetailsModal(): void {
    this.showSizeDetailsModal = true;
    this.modalStateChange.emit(true);
  }

  closeSizeDetailsModal(): void {
    this.showSizeDetailsModal = false;
    this.modalStateChange.emit(this.isCargoTypePickerOpen);
  }

  openCargoTypePicker(): void {
    this.pendingCargoTypes = this.packageInfo ? this.packageInfo.split(', ').map(item => item.trim()).filter(Boolean) : [];
    this.cargoTypeSearchQuery = '';
    this.isCargoTypePickerOpen = true;
    this.modalStateChange.emit(true);
  }

  closeCargoTypePicker(): void {
    this.isCargoTypePickerOpen = false;
    this.modalStateChange.emit(this.showSizeDetailsModal);
  }

  togglePendingCargoType(type: string): void {
    const idx = this.pendingCargoTypes.indexOf(type);
    if (idx > -1) {
      this.pendingCargoTypes.splice(idx, 1);
    } else {
      this.pendingCargoTypes.push(type);
    }
  }

  confirmCargoTypeSelection(): void {
    this.packageInfoChange.emit(this.pendingCargoTypes.join(', '));
    this.closeCargoTypePicker();
  }

  isCargoTypePending(type: string): boolean {
    return this.pendingCargoTypes.includes(type);
  }

  private _cachedCargoTypes: string[] = [];
  private _lastPackageInfo = '';

  get selectedCargoTypes(): string[] {
    if (this.packageInfo === this._lastPackageInfo && this._cachedCargoTypes.length > 0) {
      return this._cachedCargoTypes;
    }
    this._lastPackageInfo = this.packageInfo;
    this._cachedCargoTypes = this.packageInfo
      ? this.packageInfo.split(', ').map((item) => item.trim()).filter(Boolean)
      : [];
    return this._cachedCargoTypes;
  }

  removeCargoType(type: string): void {
    const updated = this.selectedCargoTypes.filter((t) => t !== type);
    this.packageInfoChange.emit(updated.join(', '));
  }

  adjustWeight(amount: number): void {
    const current = Number(this.weightKg) || 0;
    const nextVal = Math.max(0, current + amount);
    this.weightKgChange.emit(Math.round(nextVal * 10) / 10);
  }

  setWeight(val: any): void {
    const numeric = parseFloat(val) || 0;
    this.weightKgChange.emit(Math.max(0, numeric));
  }
}
