import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { BjStation } from '../../../core/interfaces/station.interface';
import { BjStationService } from '../../../core/services/bj-station.service';

export type StationBadgeStatus = 'open' | 'closed' | 'inactive';

@Component({
  selector: 'app-bj-station-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './bj-station-card.component.html',
})
export class BjStationCardComponent implements OnInit {
  @Input() station!: BjStation;
  @Input() showBookButton: boolean = true;
  /** Cho biết người dùng đã cấp quyền GPS chưa – nếu false sẽ hiển thị "---" thay vì khoảng cách */
  @Input() hasGpsPermission: boolean = false;

  @Output() bookClick = new EventEmitter<BjStation>();
  @Output() cardClick = new EventEmitter<BjStation>();

  badgeStatus: StationBadgeStatus = 'closed';
  isSaved: boolean = false;

  constructor(private stationService: BjStationService) {}

  ngOnInit(): void {
    this.badgeStatus = this._computeBadgeStatus();
  }

  get badgeLabel(): string {
    switch (this.badgeStatus) {
      case 'open':     return 'ĐANG MỞ';
      case 'closed':   return 'TẠM NGHỈ';
      case 'inactive': return 'NGƯNG HOẠT ĐỘNG';
      default:         return 'ĐÓNG CỬA';
    }
  }

  get badgeClass(): string {
    switch (this.badgeStatus) {
      case 'open':     return 'bg-emerald-500';
      case 'closed':   return 'bg-orange-500';
      case 'inactive': return 'bg-red-500';
      default:         return 'bg-red-500';
    }
  }

  get firstImage(): string {
    return this.stationService.getPrimaryImageUrl(this.station);
  }

  /** Hiển thị khoảng cách nếu có GPS, ngược lại hiển thị "---" */
  get distanceText(): string {
    if (!this.hasGpsPermission) return '---';
    if (this.station?.distance == null) return '---';
    return this.station.distance < 1
      ? `${Math.round(this.station.distance * 1000)} m`
      : `${this.station.distance.toFixed(1)} km`;
  }

  get availabilityText(): string {
    if (this.station.availableBays != null) {
      return this.station.availableBays > 0
        ? `Còn ${this.station.availableBays} chỗ`
        : 'Hết chỗ';
    }
    return '';
  }

  /** Giá thấp nhất trong danh sách dịch vụ (nếu có) */
  get minPriceText(): string {
    const prices = this.station.service_packages?.map(s => s.price).filter(p => p != null && p > 0);
    if (!prices?.length) return '';
    const min = Math.min(...prices);
    return `Từ ${min.toLocaleString('vi-VN')}đ`;
  }

  onCardClick(): void {
    this.cardClick.emit(this.station);
  }

  onBookClick(event: Event): void {
    event.stopPropagation();
    this.bookClick.emit(this.station);
  }
  
  onToggleSave(event: Event): void {
    event.stopPropagation();
    this.isSaved = !this.isSaved;
  }

  private _computeBadgeStatus(): StationBadgeStatus {
    if (!this.station || this.station.status !== 'active') return 'inactive';
    return this.stationService.isOpenNow(this.station) ? 'open' : 'closed';
  }
}
