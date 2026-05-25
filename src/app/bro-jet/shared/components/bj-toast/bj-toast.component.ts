import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'bj-toast',
  standalone: false,
  styles: [
    `
      .bj-toast-wrapper {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .bj-toast-wrapper.position-top {
        /* top set dynamically via [style.top] */
      }
      .bj-toast-wrapper.position-bottom {
        /* bottom set dynamically via [style.bottom] */
      }
      .bj-toast-wrapper.position-middle {
        top: 50%;
        transform: translate(-50%, -50%);
      }

      /* Slide-in from top */
      .bj-toast-wrapper.position-top.hidden-state {
        opacity: 0;
        transform: translateX(-50%) translateY(-14px);
      }
      .bj-toast-wrapper.position-top.visible-state {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      /* Slide-in from bottom */
      .bj-toast-wrapper.position-bottom.hidden-state {
        opacity: 0;
        transform: translateX(-50%) translateY(14px);
      }
      .bj-toast-wrapper.position-bottom.visible-state {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      /* Fade for middle */
      .bj-toast-wrapper.position-middle.hidden-state {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.96);
      }
      .bj-toast-wrapper.position-middle.visible-state {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      .bj-toast-card {
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.9rem 1.125rem;
        border-radius: 1rem;
        min-width: 300px;
        max-width: 420px;
        font-family: 'Inter', 'DM Sans', 'Segoe UI', sans-serif;
        font-size: 0.875rem;
        font-weight: 500;
        letter-spacing: -0.01em;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid transparent;
        box-shadow:
          0 8px 24px -4px rgba(0, 0, 0, 0.12),
          0 2px 8px -2px rgba(0, 0, 0, 0.08),
          0 0 0 1px rgba(255, 255, 255, 0.14) inset;
      }

      /* Success — green */
      .bj-toast-success {
        background: rgba(209, 250, 229, 0.97);
        border-color: rgba(52, 211, 153, 0.7);
        color: #064e3b;
      }
      .bj-toast-success .bj-toast-icon-wrap { color: #059669; }
      .bj-toast-success .bj-toast-progress { background: #059669; }

      /* Danger — red */
      .bj-toast-danger {
        background: rgba(254, 226, 226, 0.97);
        border-color: rgba(248, 113, 113, 0.7);
        color: #7f1d1d;
      }
      .bj-toast-danger .bj-toast-icon-wrap { color: #dc2626; }
      .bj-toast-danger .bj-toast-progress { background: #dc2626; }

      /* Warning — amber */
      .bj-toast-warning {
        background: rgba(254, 243, 199, 0.97);
        border-color: rgba(251, 191, 36, 0.75);
        color: #78350f;
      }
      .bj-toast-warning .bj-toast-icon-wrap { color: #d97706; }
      .bj-toast-warning .bj-toast-progress { background: #d97706; }

      /* Info — Bro Jet brand cyan/blue */
      .bj-toast-info {
        background: rgba(207, 250, 254, 0.97);
        border-color: rgba(34, 211, 238, 0.7);
        color: #0e4b5a;
      }
      .bj-toast-info .bj-toast-icon-wrap { color: #0891b2; }
      .bj-toast-info .bj-toast-progress { background: #0891b2; }

      .bj-toast-icon-wrap {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.75rem;
        height: 1.75rem;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
      }

      .bj-toast-icon-wrap svg {
        width: 1rem;
        height: 1rem;
      }

      .bj-toast-message {
        flex: 1;
        line-height: 1.5;
      }

      .bj-toast-close {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 0.375rem;
        background: transparent;
        border: none;
        cursor: pointer;
        opacity: 0.5;
        transition: opacity 0.15s ease, background 0.15s ease;
        padding: 0;
        color: inherit;
      }

      .bj-toast-close:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.06);
      }

      .bj-toast-close svg {
        width: 0.875rem;
        height: 0.875rem;
      }

      /* Progress bar */
      .bj-toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        border-radius: 0 0 1rem 1rem;
        animation: bj-shrink linear forwards;
      }

      @keyframes bj-shrink {
        from { width: 100%; }
        to   { width: 0%; }
      }
    `,
  ],
  template: `
    <div
      class="bj-toast-wrapper"
      [class.position-top]="position === 'top'"
      [class.position-bottom]="position === 'bottom'"
      [class.position-middle]="position === 'middle'"
      [class.visible-state]="visible"
      [class.hidden-state]="!visible"
      [style.top]="position === 'top' ? topOffset : null"
      [style.bottom]="position === 'bottom' ? bottomOffset : null"
    >
      <div
        class="bj-toast-card"
        [class.bj-toast-success]="type === 'success'"
        [class.bj-toast-danger]="type === 'danger'"
        [class.bj-toast-warning]="type === 'warning'"
        [class.bj-toast-info]="type === 'info'"
      >
        <!-- Icon -->
        <span class="bj-toast-icon-wrap">
          <!-- Success -->
          <svg *ngIf="type === 'success'" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd" />
          </svg>
          <!-- Danger -->
          <svg *ngIf="type === 'danger'" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd" />
          </svg>
          <!-- Warning -->
          <svg *ngIf="type === 'warning'" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd" />
          </svg>
          <!-- Info -->
          <svg *ngIf="type === 'info'" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd" />
          </svg>
        </span>

        <!-- Message -->
        <span class="bj-toast-message">{{ message }}</span>

        <!-- Close button -->
        <button class="bj-toast-close" (click)="close()" aria-label="Đóng">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Progress bar -->
        <div
          *ngIf="duration > 0"
          class="bj-toast-progress"
          [style.animation-duration]="duration + 'ms'"
        ></div>
      </div>
    </div>
  `,
})
export class BjToastComponent implements OnInit {
  @Input() message: string = '';
  @Input() type: 'success' | 'danger' | 'warning' | 'info' = 'info';
  @Input() duration: number = 3000;
  @Input() position: 'top' | 'bottom' | 'middle' = 'top';

  @Output() closed = new EventEmitter<void>();

  visible: boolean = false;
  topOffset: string = 'calc(env(safe-area-inset-top, 0px) + 8px)';
  bottomOffset: string = 'calc(env(safe-area-inset-bottom, 0px) + 8px)';

  ngOnInit() {
    this.calculateOffsets();
    setTimeout(() => (this.visible = true), 10);

    if (this.duration > 0) {
      setTimeout(() => this.close(), this.duration);
    }
  }

  private calculateOffsets() {
    const header = document.querySelector('ion-header');
    if (header) {
      const rect = header.getBoundingClientRect();
      this.topOffset = `${Math.round(rect.bottom) + 8}px`;
    }

    const footer =
      document.querySelector('ion-tab-bar') ||
      document.querySelector('ion-footer');
    if (footer) {
      const rect = footer.getBoundingClientRect();
      this.bottomOffset = `${Math.round(window.innerHeight - rect.top) + 8}px`;
    }
  }

  close() {
    this.visible = false;
    setTimeout(() => this.closed.emit(), 350);
  }
}
