import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface GmToast {
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class GmToastService {
  private readonly toastSubject = new Subject<GmToast>();
  readonly toast$ = this.toastSubject.asObservable();

  success(message: string): void {
    this.toastSubject.next({ type: 'success', message });
  }

  error(message: string): void {
    this.toastSubject.next({ type: 'error', message });
  }

  info(message: string): void {
    this.toastSubject.next({ type: 'info', message });
  }
}
