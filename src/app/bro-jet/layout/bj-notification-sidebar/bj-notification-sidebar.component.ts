import { CommonModule } from '@angular/common';
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { IonicModule, ModalController, PopoverController } from '@ionic/angular';
import { BjNotification, BjNotificationService } from '../../core/services/bj-notification.service';
import { BjNotificationItemComponent } from '../../shared/components/bj-notification-item/bj-notification-item.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-bj-notification-sidebar',
  standalone: true,
  imports: [CommonModule, IonicModule, BjNotificationItemComponent],
  templateUrl: './bj-notification-sidebar.component.html',
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class BjNotificationSidebarComponent implements OnInit {
  notifications: BjNotification[] = [];
  isLoading = false;

  constructor(
    private notificationService: BjNotificationService,
    private modalCtrl: ModalController,
    private popoverCtrl: PopoverController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.isLoading = true;
    this.notificationService.getNotifications(1, 10).subscribe({
      next: (res) => {
        this.notifications = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onRead(id: string) {
    this.notificationService.markAsRead(id).subscribe(() => {
      const notch = this.notifications.find(n => n.id === id);
      if (notch) notch.is_read = true;
    });
  }

  onItemClick(notification: BjNotification) {
    if (!notification.is_read) {
      this.onRead(notification.id);
    }
    this.close();
  }

  close() {
    this.popoverCtrl.dismiss();
  }

  viewAll() {
    this.close();
    this.router.navigate(['/bro-jet/notifications']);
  }
}
