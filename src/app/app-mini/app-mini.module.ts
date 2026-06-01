import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppMiniRoutingModule } from './app-mini-routing.module';
import { RlsAuthInterceptor } from './core/interceptors/rls-auth.interceptor';

/**
 * REALTIME LOCAL SOCIAL (app-mini) – NgModule lazy gốc.
 *
 * Mirror cấu trúc `BroJetModule`. RlsAuthInterceptor được provide ở mức module
 * (HTTP_INTERCEPTORS, multi: true) để gắn Bearer token + xử lý 401 cho riêng
 * app-mini, KHÔNG ảnh hưởng `gap-move`/`bro-jet`.
 *
 * Vì đây là module lazy-load, phải import `HttpClientModule` ngay tại đây để tạo
 * một `HttpHandler` riêng trong injector của module. Nếu không, các service của
 * app-mini sẽ dùng `HttpClient` gốc (root) và RlsAuthInterceptor sẽ KHÔNG bao giờ
 * chạy — request của app-mini sẽ bị `BjAuthInterceptor` (đăng ký ở root) xử lý.
 * Import ở đây cô lập chuỗi interceptor: app-mini chỉ dùng RlsAuthInterceptor,
 * còn `gap-move`/`bro-jet` vẫn dùng interceptor của chúng — không ảnh hưởng lẫn nhau.
 *
 * Core services (RlsAuthService, RlsApiService, ...) sẽ được provide ở task 11.x.
 */
@NgModule({
  imports: [CommonModule, HttpClientModule, AppMiniRoutingModule],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: RlsAuthInterceptor, multi: true },
  ],
})
export class AppMiniModule {}
