import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BjApiService } from './bj-api.service';

export interface BjLoyaltyPoints {
  available: number;
  total: number;
  used: number;
}

export interface BjVoucher {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  status: 'active' | 'used' | 'expired' | 'disabled';
}

export interface BjVoucherValidation {
  valid: boolean;
  discount: number;
  voucher?: BjVoucher;
  error?: string;
}

export interface BjRedeemResponse {
  discountAmount: number;
  remainingPoints: number;
}

@Injectable({ providedIn: 'root' })
export class BjLoyaltyService {
  constructor(private api: BjApiService) {}

  getPoints(): Observable<BjLoyaltyPoints> {
    return this.api.get('loyalty/points') as Observable<BjLoyaltyPoints>;
  }

  getAvailableVouchers(): Observable<BjVoucher[]> {
    return this.api.get('vouchers/available') as Observable<BjVoucher[]>;
  }

  validateVoucher(code: string, amount: number): Observable<BjVoucherValidation> {
    return this.api.post('vouchers/validate', { code, booking_amount: amount }) as Observable<BjVoucherValidation>;
  }

  redeemPoints(points: number, bookingId: string): Observable<BjRedeemResponse> {
    return this.api.post('loyalty/redeem', { points, booking_id: bookingId }) as Observable<BjRedeemResponse>;
  }
}
