import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BjBooking, BookingStatus } from '../../../core/interfaces/booking.interface';
import { BJ_ICONS } from '../../icons/bj-icons';

@Component({
  selector: 'app-bj-booking-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-booking-card.component.html',
  host: { class: 'block' },
})
export class BjBookingCardComponent {
  @Input() booking!: BjBooking;

  @Output() cancelClick = new EventEmitter<BjBooking>();
  @Output() detailClick = new EventEmitter<BjBooking>();

  carIcon: SafeHtml;
  calendarIcon: SafeHtml;
  receiptIcon: SafeHtml;

  constructor(private sanitizer: DomSanitizer) {
    this.carIcon = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS.CAR);
    this.calendarIcon = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS.CALENDAR);
    this.receiptIcon = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS.ARTICLE);
  }

  get statusLabel(): string {
    const map: Record<BookingStatus, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      in_progress: 'Đang rửa',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      no_show: 'Không đến',
    };
    return map[this.booking?.status] ?? this.booking?.status;
  }

  get statusClass(): string {
    switch (this.booking?.status) {
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-indigo-100 text-indigo-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'no_show': return 'bg-gray-100 text-gray-500';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  }

  get showCancelButton(): boolean {
    return this.booking?.status === 'confirmed';
  }

  get formattedDate(): string {
    if (!this.booking?.scheduledAt) return '';
    return new Date(this.booking.scheduledAt).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onCancelClick(event: Event): void {
    event.stopPropagation();
    this.cancelClick.emit(this.booking);
  }

  onDetailClick(): void {
    this.detailClick.emit(this.booking);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }
}
