import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GmBooking } from '../../core/interfaces/booking.interface';
import { GmBookingService } from '../../core/services/gm-booking.service';
import { GmBookingCardComponent } from '../../shared/components/gm-booking-card/gm-booking-card.component';
import { GmEmptyStateComponent } from '../../shared/components/gm-empty-state/gm-empty-state.component';

@Component({
  selector: 'app-gm-bookings',
  standalone: true,
  imports: [CommonModule, GmBookingCardComponent, GmEmptyStateComponent],
  templateUrl: './gm-bookings.page.html',
})
export class GmBookingsPage {
  bookings$ = this.bookingService.getBookings();

  constructor(
    private bookingService: GmBookingService,
    private router: Router,
  ) {}

  openBooking(booking: GmBooking): void {
    this.router.navigate(['/gap-move/booking', booking.id]);
  }

  createBooking(): void {
    this.router.navigateByUrl('/gap-move/booking/new');
  }
}
