import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { GmPaymentMethod } from '../interfaces/booking.interface';

export interface GmPaymentMethodOption {
  id: GmPaymentMethod;
  label: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class GmPaymentService {
  getPaymentMethods(): Observable<GmPaymentMethodOption[]> {
    return of([
      { id: 'cash', label: 'Tien mat', description: 'Thanh toan cho tai xe' },
      { id: 'wallet', label: 'Vi GapMove', description: 'Tru truc tiep so du vi' },
      { id: 'vnpay', label: 'VNPay', description: 'Thanh toan qua cong VNPay' },
      { id: 'momo', label: 'MoMo', description: 'Thanh toan qua vi MoMo' },
    ]);
  }

  createPaymentUrl(bookingId: string, method: GmPaymentMethod): Observable<string> {
    return of(`/gap-move/payment/${method}?bookingId=${encodeURIComponent(bookingId)}`);
  }
}
