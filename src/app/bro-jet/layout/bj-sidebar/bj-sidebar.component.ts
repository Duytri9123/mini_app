import {
  Component, Input, Output, EventEmitter,
  HostListener, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type SheetState = 'hidden' | 'half' | 'full';

/** Snap points: % of sheet height from top */
const SNAP = { hidden: 1.15, half: 0.40, full: 0.08 };

@Component({
  selector: 'bj-map-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BjSidebarComponent implements OnInit, OnDestroy {
  /** Desktop sidebar width in px */
  @Input() sidebarWidth = 470;

  /** Whether sidebar is visible (desktop) */
  @Input() sidebarVisible = true;

  /** Whether the mobile bottom sheet should be shown */
  @Input() showMobileSheet = true;

  /** Whether to hide the drag handle (e.g. when station detail provides its own) */
  @Input() hideHandle = false;

  /** Control the sheet state externally (e.g. force 'full' when station is selected) */
  @Input() set state(v: SheetState) {
    if (v && v !== this.sheetState) {
      this.sheetState = v;
      if (this.viewportH) {
        this.sheetTranslateY = this._snapY(v);
        this.cdr.markForCheck();
      }
    }
  }

  @Output() sidebarVisibleChange = new EventEmitter<boolean>();
  @Output() sidebarToggle = new EventEmitter<void>();
  @Output() stateChange = new EventEmitter<SheetState>();

  // ── Mobile sheet state ──────────────────────────────────────────────────
  sheetState: SheetState = 'half';
  sheetTranslateY = 0;

  private isDragging = false;
  private dragStartY = 0;
  private dragStartTranslate = 0;
  private viewportH = 0;
  private footerH = 0;
  isDesktop = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.checkPlatform();
    this._measureHeights();
    this.sheetTranslateY = this._snapY(this.sheetState);
  }

  ngOnDestroy(): void {}

  @HostListener('window:resize')
  onResize(): void {
    this.checkPlatform();
    this._measureHeights();
    this.sheetTranslateY = this._snapY(this.sheetState);
    this.cdr.markForCheck();
  }

  private checkPlatform(): void {
    this.isDesktop = window.innerWidth >= 768;
  }

  private _measureHeights(): void {
    this.viewportH = window.innerHeight;
    // CSS đã handle bottom = 68px + safe-area, JS dùng giá trị xấp xỉ
    // Lấy safe-area-inset-bottom qua element ẩn
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden';
    document.body.appendChild(el);
    const safeBottom = el.getBoundingClientRect().height || 0;
    document.body.removeChild(el);
    this.footerH = 68 + safeBottom;
  }

  // ── Desktop toggle ──────────────────────────────────────────────────────
  toggle(): void {
    this.sidebarVisible = !this.sidebarVisible;
    this.sidebarVisibleChange.emit(this.sidebarVisible);
    this.sidebarToggle.emit();
  }

  // ── Touch drag (mobile sheet) ───────────────────────────────────────────
  onTouchStart(e: TouchEvent): void {
    this.isDragging = true;
    this.dragStartY = e.touches[0].clientY;
    this.dragStartTranslate = this.sheetTranslateY;
  }

  /** Touch start on the entire sheet — only initiate drag from handle or drag-zone */
  onSheetTouchStart(e: TouchEvent): void {
    const target = e.target as HTMLElement;
    if (this._isDragTarget(target)) {
      this.isDragging = true;
      this.dragStartY = e.touches[0].clientY;
      this.dragStartTranslate = this.sheetTranslateY;
    }
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.isDragging) return;
    e.preventDefault();
    const delta = e.touches[0].clientY - this.dragStartY;
    const next = this.dragStartTranslate + delta;
    const min = this._snapY('full');
    const max = this._snapY('hidden');
    this.sheetTranslateY = Math.max(min, Math.min(max, next));
    this.cdr.markForCheck();
  }

  onTouchEnd(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this._snapToNearest();
  }

  // ── Mouse drag (for desktop/emulator) ───────────────────────────────────
  onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.dragStartY = e.clientY;
    this.dragStartTranslate = this.sheetTranslateY;
    e.preventDefault();
  }

  /** Mouse down on the entire sheet — only initiate drag from handle or drag-zone */
  onSheetMouseDown(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (this._isDragTarget(target)) {
      this.isDragging = true;
      this.dragStartY = e.clientY;
      this.dragStartTranslate = this.sheetTranslateY;
      e.preventDefault();
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const delta = e.clientY - this.dragStartY;
    const next = this.dragStartTranslate + delta;
    const min = this._snapY('full');
    const max = this._snapY('hidden');
    this.sheetTranslateY = Math.max(min, Math.min(max, next));
    this.cdr.markForCheck();
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this._snapToNearest();
  }

  /** Check if the target element is a valid drag initiator */
  private _isDragTarget(el: HTMLElement): boolean {
    // Allow drag from the handle area (first child of sheet)
    const handle = el.closest('[style*="touch-action: none"]');
    if (handle) return true;
    // Allow drag from elements with sheet-drag-zone class
    if (el.classList.contains('sheet-drag-zone') || el.closest('.sheet-drag-zone')) return true;
    return false;
  }

  get isAnimating(): boolean { return !this.isDragging; }

  // ── Private ─────────────────────────────────────────────────────────────
  private _snapY(state: SheetState): number {
    // Sheet height = viewport - footer area
    const sheetH = this.viewportH - this.footerH;
    return sheetH * SNAP[state];
  }

  private _snapToNearest(): void {
    const states: SheetState[] = ['hidden', 'half', 'full'];
    let nearest: SheetState = 'half';
    let minDist = Infinity;
    for (const s of states) {
      const dist = Math.abs(this.sheetTranslateY - this._snapY(s));
      if (dist < minDist) { minDist = dist; nearest = s; }
    }
    const previousState = this.sheetState;
    this.sheetState = nearest;
    this.sheetTranslateY = this._snapY(nearest);
    if (previousState !== nearest) {
      this.stateChange.emit(nearest);
    }
    this.cdr.markForCheck();
  }

  openSheet(state: SheetState = 'half'): void {
    this.sheetState = state;
    this.sheetTranslateY = this._snapY(state);
    this.cdr.markForCheck();
  }
}
