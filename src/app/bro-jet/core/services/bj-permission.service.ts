import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

@Injectable({ providedIn: 'root' })
export class BjPermissionService {
  private requested = false;

  /**
   * Xin quyền camera (cho QR scan) và vị trí (cho bản đồ) khi vào app.
   * Chỉ chạy 1 lần duy nhất.
   */
  async requestAll(): Promise<void> {
    if (this.requested) return;
    this.requested = true;

    await Promise.allSettled([
      this.requestLocation(),
      this.requestCamera(),
    ]);
  }

  async requestCamera(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await Camera.checkPermissions();
        if (status.camera === 'granted') return true;
        const result = await Camera.requestPermissions({ permissions: ['camera'] });
        return result.camera === 'granted';
      } else {
        // Web fallback: dùng navigator.mediaDevices
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        return true;
      }
    } catch {
      return false;
    }
  }

  async requestLocation(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await Geolocation.checkPermissions();
        if (status.location === 'granted') return true;
        const result = await Geolocation.requestPermissions({ permissions: ['location'] });
        return result.location === 'granted';
      } else {
        // Web fallback: dùng navigator.geolocation
        return new Promise<boolean>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => resolve(false),
            { timeout: 5000 }
          );
        });
      }
    } catch {
      return false;
    }
  }
}
