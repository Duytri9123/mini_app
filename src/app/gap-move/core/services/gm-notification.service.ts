import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { GmNotification } from '../interfaces/notification.interface';

@Injectable({ providedIn: 'root' })
export class GmNotificationService {
  private readonly notifications$ = new BehaviorSubject<GmNotification[]>([
    {
      id: 'noti-1',
      title: 'Tai xe da nhan don',
      body: 'Tai xe dang di chuyen den diem don cua ban.',
      type: 'booking',
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: '/gap-move/bookings',
    },
    {
      id: 'noti-2',
      title: 'Uu dai giao hang',
      body: 'Giam 10k cho don giao hang trong ngay.',
      type: 'delivery',
      read: true,
      createdAt: new Date().toISOString(),
    },
  ]);

  readonly unreadCount$ = this.notifications$.pipe(
    map((items) => items.filter((item) => !item.read).length),
  );

  getNotifications() {
    return this.notifications$.asObservable();
  }

  markAsRead(id: string): void {
    this.notifications$.next(
      this.notifications$.getValue().map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    );
  }
}
