import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
// import { EchoService } from '../../../../gogo/services/echo.service';
import { BjAuthService } from '../../../core/services/bj-auth.service';
import { WalletTopupEvent } from '../interfaces/wallet.types';

@Injectable({ providedIn: 'root' })
export class WalletRealtimeService implements OnDestroy {
  /** Emits whenever a successful topup event is received from SEPAY via Pusher */
  readonly topupReceived$ = new Subject<WalletTopupEvent>();

  private channelName: string | null = null;

  constructor(
    // private echoService: EchoService,
    private authService: BjAuthService,
  ) {}

  /**
   * Subscribe to the user's private payment channel.
   * Safe to call multiple times — will not double-subscribe.
   */
  subscribe(): void {
    const user = this.authService.getCurrentUser();

    if (!user?.id) {
      console.warn('[WalletRealtimeService] Cannot subscribe: no authenticated user.');
      return;
    }

    const channelName = `payment.user.${user.id}`;

    if (this.channelName === channelName) {
      return; // already subscribed
    }

    try {
      // this.echoService.echo
      //   .private(channelName)
      //   .listen('.payment.updated', (event: WalletTopupEvent) => {
      //     if (event?.status === 'success') {
      //       this.topupReceived$.next(event);
      //     }
      //   });

      this.channelName = channelName;
    } catch (e) {
      console.error('[WalletRealtimeService] Failed to subscribe to payment channel:', e);
    }
  }

  unsubscribe(): void {
    if (!this.channelName) return;

    try {
      // this.echoService.echo.leave(this.channelName);
    } catch (e) {
      console.warn('[WalletRealtimeService] Error leaving channel:', e);
    } finally {
      this.channelName = null;
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe();
    this.topupReceived$.complete();
  }
}
