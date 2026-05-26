export type GmNotificationType = 'booking' | 'delivery' | 'payment' | 'system';

export interface GmNotification {
  id: string;
  title: string;
  body: string;
  type: GmNotificationType;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}
