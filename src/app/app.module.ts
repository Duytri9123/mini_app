import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

/*
 * ── OLD JOB GOGO APP MODULE (commented out for BRO JET) ─────────────────────
 *
 * import { LayoutModule } from './gogo/layout/layout.module';
 * import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
 * import { CustomHttpLoader } from './custom-http-loader';
 * import { MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';
 * import { SafeUrlPipe } from './gogo/pipes/safe-url.pipe';
 * import { QuillModule } from 'ngx-quill';
 * import { QRCodeComponent } from 'angularx-qrcode';
 * import { CommonModule } from '@angular/common';
 * import { SuccessModalComponent } from './gogo/components/success-modal/success-modal.component';
 * import { LocationModalComponent } from './gogo/pages/chat/location-modal.component';
 * import { TailwindToastComponent } from './gogo/services/tailwind-toast.component';
 * import { GlobalApprovalModalComponent } from './gogo/components/global-approval-modal/global-approval-modal.component';
 * import { ApplicationApprovalModalComponent } from './gogo/components/application-approval-modal/application-approval-modal.component';
 *
 * Full implementation preserved in git history.
 */
