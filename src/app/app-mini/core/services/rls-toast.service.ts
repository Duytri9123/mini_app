import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

/** Toast colors supported by Ionic, mapped to RLS feedback intents. */
export type RlsToastColor =
  | 'success'
  | 'danger'
  | 'warning'
  | 'primary'
  | 'medium';

export type RlsToastPosition = 'top' | 'bottom' | 'middle';

/**
 * Toast/feedback helper for the `app-mini` (realtime-local-social) module.
 *
 * Mirrors `BjToastService`'s public API (`presentToast`, `success`, `error`,
 * `warning`, `info`) while delegating presentation to Ionic's standalone
 * `ToastController`, consistent with the project's `@ionic/angular/standalone`
 * usage.
 *
 * Requirements: 14.5
 */
@Injectable({
  providedIn: 'root',
})
export class RlsToastService {
  private readonly toastCtrl = inject(ToastController);

  /** Present a fully customised toast. */
  async presentToast(
    message: string,
    color: RlsToastColor = 'success',
    duration = 3000,
    position: RlsToastPosition = 'top',
  ): Promise<HTMLIonToastElement> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration,
      position,
      buttons: [{ icon: 'close', role: 'cancel' }],
    });
    await toast.present();
    return toast;
  }

  /** Success feedback (green). */
  async success(
    message: string,
    duration = 3000,
    position: RlsToastPosition = 'top',
  ): Promise<HTMLIonToastElement> {
    return this.presentToast(message, 'success', duration, position);
  }

  /** Error feedback (red). */
  async error(
    message: string,
    duration = 4000,
    position: RlsToastPosition = 'top',
  ): Promise<HTMLIonToastElement> {
    return this.presentToast(message, 'danger', duration, position);
  }

  /** Warning feedback (amber). */
  async warning(
    message: string,
    duration = 3500,
    position: RlsToastPosition = 'top',
  ): Promise<HTMLIonToastElement> {
    return this.presentToast(message, 'warning', duration, position);
  }

  /** Informational feedback (primary). */
  async info(
    message: string,
    duration = 3000,
    position: RlsToastPosition = 'top',
  ): Promise<HTMLIonToastElement> {
    return this.presentToast(message, 'primary', duration, position);
  }

  /** Dismiss the currently presented toast, if any. */
  async dismiss(): Promise<void> {
    const top = await this.toastCtrl.getTop();
    if (top) {
      await top.dismiss();
    }
  }
}
