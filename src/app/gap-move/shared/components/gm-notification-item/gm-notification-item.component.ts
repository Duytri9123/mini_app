import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GmNotification } from '../../../core/interfaces/notification.interface';

@Component({
  selector: 'app-gm-notification-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gm-notification-item.component.html',
})
export class GmNotificationItemComponent {
  @Input({ required: true }) notification!: GmNotification;
  @Output() read = new EventEmitter<string>();
}
