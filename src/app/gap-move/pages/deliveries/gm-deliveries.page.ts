import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GmDeliveryService } from '../../core/services/gm-delivery.service';
import { formatVnd } from '../../core/utils/helpers';

@Component({
  selector: 'app-gm-deliveries',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './gm-deliveries.page.html',
})
export class GmDeliveriesPage {
  deliveries$ = this.deliveryService.getDeliveries();

  constructor(private deliveryService: GmDeliveryService) {}

  formatAmount(amount: number): string {
    return formatVnd(amount);
  }
}
