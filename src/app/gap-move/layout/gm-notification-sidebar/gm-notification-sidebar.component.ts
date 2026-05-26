import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GmNotificationService } from '../../core/services/gm-notification.service';
import { GmNotificationItemComponent } from '../../shared/components/gm-notification-item/gm-notification-item.component';

@Component({
  selector: 'app-gm-notification-sidebar',
  standalone: true,
  imports: [CommonModule, GmNotificationItemComponent],
  templateUrl: './gm-notification-sidebar.component.html',
})
export class GmNotificationSidebarComponent {
  notifications$ = this.notificationService.getNotifications();

  constructor(private notificationService: GmNotificationService) {}

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id);
  }
}
