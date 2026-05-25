export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PaymentMethod = 'wallet' | 'vnpay' | 'momo' | 'cash';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface BjBooking {
  id: string;
  status: BookingStatus;
  stationId: string;
  stationName?: string;
  vehicleId: string;
  licensePlate?: string;
  packageId: string;
  packageName?: string;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  loyaltyPointsEarned?: number;
  /** URL thanh toán online (VNPay/MoMo) — backend trả về sau khi tạo booking */
  paymentUrl?: string;
  /** QR code data (base64 hoặc URL ảnh QR) cho thanh toán tại quầy */
  qrCodeUrl?: string;
}

export interface BjCreateBookingRequest {
  vehicleId: string;
  stationId: string;
  packageId: string;
  scheduledAt: string;
  voucherCode?: string;
  paymentMethod: PaymentMethod;
  redeemPoints?: number;
}
