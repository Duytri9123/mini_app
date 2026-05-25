import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { retry, takeUntil } from 'rxjs/operators';

export interface BjWashProgress {
  progress: number;
  status: string;
  etaSeconds: number;
}

const WS_BASE_URL = 'wss://api.brojet.vn/iot/booking';
const RECONNECT_DELAY_MS = 3000;

@Injectable({ providedIn: 'root' })
export class BjIotService implements OnDestroy {
  private _destroy$ = new Subject<void>();
  private _sockets = new Map<string, WebSocketSubject<BjWashProgress>>();

  /**
   * Kết nối WebSocket để theo dõi tiến độ rửa xe theo thời gian thực.
   * Tự động reconnect khi mất kết nối.
   */
  getBookingProgress(bookingId: string): Observable<BjWashProgress> {
    const existing = this._sockets.get(bookingId);
    if (existing && !existing.closed) {
      return existing.asObservable();
    }

    const socket$ = webSocket<BjWashProgress>({
      url: `${WS_BASE_URL}/${bookingId}/progress`,
      openObserver: {
        next: () => console.log(`[BjIotService] WS connected for booking ${bookingId}`)
      },
      closeObserver: {
        next: () => {
          console.log(`[BjIotService] WS closed for booking ${bookingId}`);
          this._sockets.delete(bookingId);
        }
      }
    });

    this._sockets.set(bookingId, socket$);

    return socket$.pipe(
      retry({ delay: RECONNECT_DELAY_MS }),
      takeUntil(this._destroy$)
    );
  }

  /** Đóng kết nối WebSocket cho một booking cụ thể */
  closeProgress(bookingId: string): void {
    const socket = this._sockets.get(bookingId);
    if (socket) {
      socket.complete();
      this._sockets.delete(bookingId);
    }
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
    this._sockets.forEach(s => s.complete());
    this._sockets.clear();
  }
}
