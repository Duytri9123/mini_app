import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BroJetRoutingModule } from './bro-jet-routing.module';
import { BjAuthService } from './core/services/bj-auth.service';
import { BjBookingService } from './core/services/bj-booking.service';
import { BjPaymentService } from './core/services/bj-payment.service';
import { BjLoyaltyService } from './core/services/bj-loyalty.service';
import { BjVehicleService } from './core/services/bj-vehicle.service';
import { BjIotService } from './core/services/bj-iot.service';
import { BjNotificationService } from './core/services/bj-notification.service';
import { BjToastService } from './core/services/bj-toast.service';

@NgModule({
  imports: [CommonModule, BroJetRoutingModule],
  providers: [
    BjAuthService,
    BjBookingService,
    BjPaymentService,
    BjLoyaltyService,
    BjVehicleService,
    BjIotService,
    BjNotificationService,
    BjToastService,
  ],
})
export class BroJetModule {}
