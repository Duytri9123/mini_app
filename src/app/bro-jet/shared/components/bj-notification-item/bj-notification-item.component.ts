import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BjNotification, NotificationType } from '../../../core/services/bj-notification.service';
import { formatRelativeTime } from '../../../core/utils/helpers';

@Component({
  selector: 'app-bj-notification-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-notification-item.component.html',
})
export class BjNotificationItemComponent {
  @Input() notification!: BjNotification;
  @Output() read = new EventEmitter<string>();
  @Output() itemClick = new EventEmitter<BjNotification>();

  TYPE_ICONS: Record<string, string> = {
    wallet_topup: '💰',
    wallet_withdraw: '💸',
    withdraw_request: '📤',
    booking: '📅',
    system: '⚙️',
  };

  formatTime(date: string): string {
    return formatRelativeTime(date);
  }

  handleClick() {
    if (!this.notification.is_read) {
      this.read.emit(this.notification.id);
    }
    this.itemClick.emit(this.notification);
  }

  getIcon(): string {
    return this.TYPE_ICONS[this.notification.type] ?? '🔔';
  }
}
