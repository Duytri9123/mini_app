import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GmAddressStop } from '../../../core/interfaces/location.interface';
import { formatVnd } from '../../../core/utils/helpers';

@Component({
  selector: 'app-gm-route-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gm-route-summary.component.html',
})
export class GmRouteSummaryComponent {
  @Input() pickup?: GmAddressStop;
  @Input() dropoff?: GmAddressStop;
  @Input() distanceKm = 0;
  @Input() durationMin = 0;
  @Input() finalAmount = 0;

  formatAmount(amount: number): string {
    return formatVnd(amount);
  }
}
