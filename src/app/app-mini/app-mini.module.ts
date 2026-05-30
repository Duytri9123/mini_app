import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppMiniRoutingModule } from './app-mini-routing.module';

/**
 * REALTIME LOCAL SOCIAL (app-mini) – NgModule lazy gốc.
 *
 * Mirror cấu trúc `BroJetModule`. Ở task 10.1 chỉ wiring routing tối thiểu.
 * Core services (RlsAuthService, RlsApiService, ...) và RlsAuthInterceptor
 * (HTTP_INTERCEPTORS, multi: true) sẽ được provide ở task 10.3 / 11.x.
 */
@NgModule({
  imports: [CommonModule, AppMiniRoutingModule],
  providers: [],
})
export class AppMiniModule {}
