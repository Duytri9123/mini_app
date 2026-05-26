import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  GmBooking,
  GmCreateBookingRequest,
} from '../interfaces/booking.interface';
import { createId } from '../utils/helpers';
import { calculateGapMovePrice } from '../utils/booking-price.utils';
import { GmDriverService } from './gm-driver.service';

const PICKUP = {
  id: 'pickup-demo',
  label: 'Diem don',
  address: 'Ben Thanh, Quan 1',
  coordinate: { lat: 10.7769, lng: 106.7009 },
};

const DROPOFF = {
  id: 'dropoff-demo',
  label: 'Diem den',
  address: 'Thao Dien, Thu Duc',
  coordinate: { lat: 10.802, lng: 106.731 },
};

@Injectable({ providedIn: 'root' })
export class GmBookingService {
  private readonly bookings$ = new BehaviorSubject<GmBooking[]>([
    {
      id: 'GM-1001',
      type: 'ride',
      status: 'driver_assigned',
      pickup: PICKUP,
      dropoff: DROPOFF,
      customerName: 'GapMove Customer',
      vehicleType: 'motorbike',
      scheduledAt: new Date().toISOString(),
      distanceKm: 6.4,
      durationMin: 24,
      baseFare: 12000,
      distanceFare: 33300,
      timeFare: 10800,
      surcharge: 0,
      porterFare: 0,
      additionalServiceFare: 0,
      discountAmount: 5000,
      finalAmount: 51200,
      paymentMethod: 'wallet',
      paymentStatus: 'paid',
    },
    {
      id: 'GM-1002',
      type: 'delivery',
      status: 'searching',
      pickup: DROPOFF,
      dropoff: PICKUP,
      customerName: 'GapMove Customer',
      vehicleType: 'motorbike',
      packageInfo: 'Tai lieu A4',
      scheduledAt: new Date().toISOString(),
      distanceKm: 4.2,
      durationMin: 18,
      baseFare: 15000,
      distanceFare: 26000,
      timeFare: 8100,
      surcharge: 0,
      porterFare: 0,
      additionalServiceFare: 0,
      discountAmount: 0,
      finalAmount: 49100,
      paymentMethod: 'cash',
      paymentStatus: 'pending',
    },
  ]);

  constructor(private driverService: GmDriverService) {}

  getBookings(): Observable<GmBooking[]> {
    return this.bookings$.asObservable();
  }

  getBookingById(id: string): Observable<GmBooking | null> {
    return of(this.bookings$.getValue().find((booking) => booking.id === id) ?? null);
  }

  createBooking(request: GmCreateBookingRequest): Observable<GmBooking> {
    const distanceKm = request.type === 'porter' ? 0 : request.vehicleType === 'truck' ? 12.8 : request.vehicleType === 'van' ? 8.6 : 5.6;
    const durationMin =
      request.type === 'porter'
        ? Math.max(30, (request.porterOptions?.helperCount ?? 1) * 20 + (request.porterOptions?.floorCount ?? 0) * 8)
        : Math.ceil(distanceKm * 3.6);
    const price = calculateGapMovePrice({
      type: request.type,
      vehicleType: request.vehicleType,
      distanceKm,
      durationMin,
      voucherDiscount: request.promoCode ? 10000 : 0,
      porterOptions: request.porterOptions,
      additionalServiceCount: request.additionalServices?.filter((item) => item !== 'porter').length ?? 0,
    });

    const booking: GmBooking = {
      id: createId('GM').toUpperCase(),
      type: request.type,
      status: 'searching',
      pickup: request.pickup,
      dropoff: request.dropoff,
      stops: request.stops,
      customerName: 'GapMove Customer',
      vehicleType: request.vehicleType,
      scheduledAt: request.scheduledAt ?? new Date().toISOString(),
      distanceKm,
      durationMin,
      baseFare: price.baseFare,
      distanceFare: price.distanceFare,
      timeFare: price.timeFare,
      surcharge: price.surcharge,
      porterFare: price.porterFare,
      additionalServiceFare: price.additionalServiceFare,
      discountAmount: price.discountAmount,
      finalAmount: price.finalAmount,
      paymentMethod: request.paymentMethod,
      paymentStatus: request.paymentMethod === 'cash' ? 'pending' : 'paid',
      additionalServices: request.additionalServices,
      porterOptions: request.porterOptions,
      packageInfo: request.packageInfo,
      note: request.note,
    };

    this.driverService.findAvailableDriver(request.vehicleType).subscribe((driver) => {
      booking.driver = driver ?? undefined;
      booking.status = driver ? 'driver_assigned' : 'searching';
    });

    this.bookings$.next([booking, ...this.bookings$.getValue()]);
    return of(booking);
  }
}
