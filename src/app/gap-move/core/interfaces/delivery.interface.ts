import { GmBookingStatus } from './booking.interface';
import { GmAddressStop } from './location.interface';

export type GmPackageSize = 'document' | 'small' | 'medium' | 'large';
export type GmDeliverySpeed = 'standard' | 'express' | 'scheduled';

export interface GmDeliveryOrder {
  id: string;
  trackingCode: string;
  status: GmBookingStatus;
  packageSize: GmPackageSize;
  speed: GmDeliverySpeed;
  pickup: GmAddressStop;
  dropoff: GmAddressStop;
  recipientName: string;
  recipientPhone: string;
  codAmount?: number;
  finalAmount: number;
  createdAt: string;
}
