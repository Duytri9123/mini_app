import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BjApiService } from './bj-api.service';
import { BjBooking, BjCreateBookingRequest, BookingStatus } from '../interfaces/booking.interface';

export interface BjBookingHistoryResponse {
  data: BjBooking[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class BjBookingService {
  constructor(private api: BjApiService) {}

  createBooking(req: BjCreateBookingRequest): Observable<BjBooking> {
    return this.api.post('bookings', req) as Observable<BjBooking>;
  }

  cancelBooking(id: string, reason: string): Observable<BjBooking> {
    return this.api.patch(`bookings/${id}/cancel`, { reason }) as Observable<BjBooking>;
  }

  getBookingById(id: string): Observable<BjBooking> {
    return this.api.get(`bookings/${id}`) as Observable<BjBooking>;
  }

  getBookingHistory(page: number, limit: number, status?: BookingStatus): Observable<BjBookingHistoryResponse> {
    let url = `bookings/history?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }
    return this.api.get(url) as Observable<BjBookingHistoryResponse>;
  }

  getActiveBooking(): Observable<BjBooking | null> {
    return this.api.get('bookings/active') as Observable<BjBooking | null>;
  }
}
