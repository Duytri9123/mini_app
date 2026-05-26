import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GmToast, GmToastService } from '../../../core/services/gm-toast.service';

@Component({
  selector: 'app-gm-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="toast"
      class="fixed left-4 right-4 top-4 z-[9999] rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg"
      [class.bg-emerald-600]="toast.type === 'success'"
      [class.bg-red-600]="toast.type === 'error'"
      [class.bg-slate-800]="toast.type === 'info'"
    >
      {{ toast.message }}
    </div>
  `,
})
export class GmToastComponent implements OnInit, OnDestroy {
  toast: GmToast | null = null;
  private sub?: Subscription;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(private toastService: GmToastService) {}

  ngOnInit(): void {
    this.sub = this.toastService.toast$.subscribe((toast) => {
      this.toast = toast;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => (this.toast = null), 2500);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    clearTimeout(this.timer);
  }
}
