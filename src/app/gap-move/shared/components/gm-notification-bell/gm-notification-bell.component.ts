import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { GmNotificationService } from '../../../core/services/gm-notification.service';

@Component({
  selector: 'app-gm-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './gm-notification-bell.component.html',
})
export class GmNotificationBellComponent {
  unreadCount$ = this.notificationService.unreadCount$;

  constructor(private notificationService: GmNotificationService) {}
}
