import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Điểm dừng (snap point) của bottom sheet (design.md §9.3 `RlsBottomSheetComponent`).
 * - `collapsed` — chỉ ló thanh kéo + header (peek), bản đồ chiếm phần lớn màn hình.
 * - `half`      — nửa màn hình (mặc định) cho nearby/trending panel.
 * - `full`      — gần toàn màn hình để đọc nội dung dài.
 */
export type RlsBottomSheetSnap = 'collapsed' | 'half' | 'full';

/** Thứ tự snap từ thấp → cao (dùng để kéo/đập về điểm gần nhất). */
const SNAP_ORDER: readonly RlsBottomSheetSnap[] = ['collapsed', 'half', 'full'];

/**
 * Chiều cao mỗi snap point theo % chiều cao khung chứa (vh-like, 0..1).
 * Mirror cảm giác bottom sheet `bro-jet` nhưng theme tối + neon.
 */
const SNAP_FRACTION: Record<RlsBottomSheetSnap, number> = {
  collapsed: 0.12,
  half: 0.5,
  full: 0.92,
};

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Bottom sheet với snap points + kéo nhanh.
 * ─────────────────────────────────────────────────────────────────────────────
 * Presentational standalone component (design.md §9.3) host cho nearby/trending
 * panel trên `HomeMapPage` (R2.4). Quản lý 3 điểm dừng (`collapsed`/`half`/`full`),
 * kéo bằng pointer (chuột/cảm ứng), khi thả sẽ "đập" (snap) về điểm gần nhất.
 *
 * Hai chiều dữ liệu theo design:
 *  - `@Input snap`        — điểm dừng hiện tại (hỗ trợ `[(snap)]` two-way binding).
 *  - `@Output snapChange` — phát khi điểm dừng đổi (do kéo hoặc gọi `snapTo`).
 *
 * Style: dark mode + viền neon + glassmorphism nhẹ (Tailwind v4 utilities),
 * không hardcode URL/asset. Component thuần UI — không gọi service, không biết
 * dữ liệu nội dung (nội dung truyền qua `<ng-content>`).
 *
 * _Requirements: 2.4, 14.5 — Design §6.1, §9.3_
 */
@Component({
  selector: 'rls-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rls-bottom-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsBottomSheetComponent {
  /** Điểm dừng hiện tại (two-way: `[(snap)]`). */
  @Input()
  get snap(): RlsBottomSheetSnap {
    return this._snap;
  }
  set snap(value: RlsBottomSheetSnap) {
    this._snap = SNAP_FRACTION[value] != null ? value : 'half';
  }
  private _snap: RlsBottomSheetSnap = 'half';

  /** Cho phép kéo để đổi snap point (tắt khi muốn cố định). */
  @Input() draggable = true;

  /** Phát khi điểm dừng đổi (two-way binding `snapChange`). */
  @Output() snapChange = new EventEmitter<RlsBottomSheetSnap>();

  /** Phần tử sheet để đo chiều cao khung khi kéo. */
  @ViewChild('sheet', { static: true }) sheetRef!: ElementRef<HTMLElement>;

  /** Đang kéo — dùng để tắt transition cho mượt và đổi con trỏ. */
  dragging = false;

  /** Offset px tạm thời trong lúc kéo (>0 = kéo xuống, <0 = kéo lên). */
  dragDeltaPx = 0;

  /** Toạ độ Y khi bắt đầu kéo (pointer). */
  private startY = 0;

  /** Id pointer đang theo dõi (pointer capture) để bỏ qua pointer khác. */
  private activePointerId: number | null = null;

  /** Gắn class block + chiều cao full để sheet định vị tuyệt đối trong host map. */
  @HostBinding('class') readonly hostClass =
    'pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col justify-end';

  /** Chiều cao hiển thị hiện tại (px-less, dùng cho style `height` qua %). */
  get heightPercent(): number {
    return Math.round(SNAP_FRACTION[this._snap] * 100);
  }

  /** Translate tạm trong lúc kéo (px) — clamp để không vượt quá full. */
  get translatePx(): number {
    return this.dragging ? this.dragDeltaPx : 0;
  }

  /** Bắt đầu kéo từ thanh handle. */
  onPointerDown(event: PointerEvent): void {
    if (!this.draggable || this.activePointerId !== null) {
      return;
    }
    this.activePointerId = event.pointerId;
    this.startY = event.clientY;
    this.dragDeltaPx = 0;
    this.dragging = true;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  /** Cập nhật offset trong lúc kéo. */
  onPointerMove(event: PointerEvent): void {
    if (!this.dragging || event.pointerId !== this.activePointerId) {
      return;
    }
    this.dragDeltaPx = event.clientY - this.startY;
  }

  /** Thả tay → tính snap point gần nhất theo vị trí kéo. */
  onPointerUp(event: PointerEvent): void {
    if (!this.dragging || event.pointerId !== this.activePointerId) {
      return;
    }
    const containerH = this.containerHeight();
    // Chiều cao "mong muốn" sau khi kéo (px kéo xuống làm sheet thấp đi).
    const currentH = SNAP_FRACTION[this._snap] * containerH;
    const targetH = currentH - this.dragDeltaPx;
    const next = this.nearestSnap(containerH > 0 ? targetH / containerH : 0);

    this.dragging = false;
    this.dragDeltaPx = 0;
    this.activePointerId = null;
    this.snapTo(next);
  }

  /** Click thanh handle (không kéo) → luân chuyển qua các snap point. */
  cycle(): void {
    const idx = SNAP_ORDER.indexOf(this._snap);
    const next = SNAP_ORDER[(idx + 1) % SNAP_ORDER.length];
    this.snapTo(next);
  }

  /** Đặt snap point và phát `snapChange` nếu thay đổi (API công khai cho page). */
  snapTo(next: RlsBottomSheetSnap): void {
    if (next === this._snap) {
      return;
    }
    this._snap = next;
    this.snapChange.emit(next);
  }

  /** Chiều cao khung chứa (px) để quy đổi fraction ↔ px khi kéo. */
  private containerHeight(): number {
    const el = this.sheetRef?.nativeElement;
    const parent = el?.parentElement;
    const h = parent?.clientHeight ?? el?.clientHeight ?? 0;
    return h > 0 ? h : (typeof window !== 'undefined' ? window.innerHeight : 0);
  }

  /** Tìm snap point có fraction gần `fraction` nhất (0..1). */
  private nearestSnap(fraction: number): RlsBottomSheetSnap {
    let best: RlsBottomSheetSnap = SNAP_ORDER[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const snap of SNAP_ORDER) {
      const dist = Math.abs(SNAP_FRACTION[snap] - fraction);
      if (dist < bestDist) {
        bestDist = dist;
        best = snap;
      }
    }
    return best;
  }
}
