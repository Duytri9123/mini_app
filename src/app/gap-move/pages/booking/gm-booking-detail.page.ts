import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { GmBooking } from '../../core/interfaces/booking.interface';
import { GmBookingService } from '../../core/services/gm-booking.service';
import { GmRouteSummaryComponent } from '../../shared/components/gm-route-summary/gm-route-summary.component';
import { formatVnd } from '../../core/utils/helpers';

@Component({
  selector: 'app-gm-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, GmRouteSummaryComponent],
  templateUrl: './gm-booking-detail.page.html',
})
export class GmBookingDetailPage implements OnInit {
  booking$!: Observable<GmBooking | null>;

  constructor(
    private route: ActivatedRoute,
    private bookingService: GmBookingService,
  ) {}

  ngOnInit(): void {
    this.booking$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        return id ? this.bookingService.getBookingById(id) : of(null);
      }),
    );
  }

  formatAmount(amount: number): string {
    return formatVnd(amount);
  }
}
