import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GapMoveRoutingModule } from './gapmove-routing.module';
import { GmAuthService } from './core/services/gm-auth.service';
import { GmBookingService } from './core/services/gm-booking.service';
import { GmDeliveryService } from './core/services/gm-delivery.service';
import { GmDriverService } from './core/services/gm-driver.service';
import { GmLocationService } from './core/services/gm-location.service';
import { GmNotificationService } from './core/services/gm-notification.service';
import { GmPaymentService } from './core/services/gm-payment.service';
import { GmToastService } from './core/services/gm-toast.service';
import { GmVehicleService } from './core/services/gm-vehicle.service';
import { GmWalletService } from './core/services/gm-wallet.service';

@NgModule({
  imports: [CommonModule, GapMoveRoutingModule],
  providers: [
    GmAuthService,
    GmBookingService,
    GmDeliveryService,
    GmDriverService,
    GmLocationService,
    GmNotificationService,
    GmPaymentService,
    GmToastService,
    GmVehicleService,
    GmWalletService,
  ],
})
export class GapMoveModule {}
