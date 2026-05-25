/**
 * @deprecated
 * This service is kept for backward compatibility with other parts of the app
 * (e.g. booking payment flow).
 *
 * For wallet/topup logic use:
 *   - WalletApiService      → API calls
 *   - VietQrBuilderService  → QR URL builder
 *   - WalletRealtimeService → Pusher subscription
 */
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BjApiService } from './bj-api.service';
import { PaymentMethod } from '../interfaces/booking.interface';

export interface BjPaymentResponse {
  success: boolean;
  transaction_id?: string;
  transactionId?: string;
}

@Injectable({ providedIn: 'root' })
export class BjPaymentService {
  constructor(private api: BjApiService) {}

  processPayment(bookingId: string, method: PaymentMethod, amount: number): Observable<BjPaymentResponse> {
    return this.api.post('payments/process', { booking_id: bookingId, method, amount }) as Observable<BjPaymentResponse>;
  }
}
