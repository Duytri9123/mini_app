import { Component, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  async ngOnInit(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await SocialLogin.initialize({
        google: {
          webClientId: environment.GOOGLE_CLIENT_ID,
        },
      });
    }
  }
}

/*
 * ── OLD JOB GOGO APP COMPONENT (commented out for BRO JET) ──────────────────
 *
 * import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
 * import { NavigationEnd, Router } from '@angular/router';
 * import { NavController, Platform } from '@ionic/angular';
 * import { take } from 'rxjs/operators';
 * import { firstValueFrom, Subscription } from 'rxjs';
 * import { UserService } from './gogo/services/user.service';
 * import { RealtimeSocketService } from './gogo/services/realtime-socket.service';
 * import { CvRealtimeService } from './gogo/services/cv-realtime.service';
 * import { TabBarService } from './gogo/services/tab-bar.service';
 * import { ApplicationQuickStatusService } from './gogo/services/application-quick-status.service';
 * import { GlobalApprovalModalService } from './gogo/services/global-approval-modal.service';
 * import { PushNotificationService } from './gogo/services/push-notification.service';
 * import { LocalNotificationService } from './gogo/services/local-notification.service';
 * import { RealtimeNotificationService } from './gogo/services/realtime-notification.service';
 * import { Capacitor } from '@capacitor/core';
 * import { SocialLogin } from '@capgo/capacitor-social-login';
 * import { LocationService } from './gogo/services/location.service';
 * import { StartupLoadingService } from './gogo/services/startup-loading.service';
 * import { prewarmMapStyles } from './gogo/utils/map-init.utils';
 * import { prewarmDefaultMarkerIcons } from './gogo/utils/map-marker.utils';
 * import { ToastService } from './gogo/services/toast.service';
 * import { ApiService } from './gogo/services/api.service';
 * import { ApplicationApprovalService } from './gogo/services/application-approval.service';
 * import { ApprovalModalConfig, ApprovalResponse } from './gogo/components/application-approval-modal/application-approval-modal.component';
 * import { SuccessModalConfig } from './gogo/components/success-modal/success-modal.component';
 * import { GlobalSuccessModalService } from './gogo/services/global-success-modal.service';
 *
 * Full implementation preserved in git history.
 */
