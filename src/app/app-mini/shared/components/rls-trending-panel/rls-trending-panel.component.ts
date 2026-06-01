import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { RlsTrendingPlace, RlsTrendingReason } from '../../../core/interfaces';

/** Nhãn + style theo từng lý do trending (design.md §6.5, R6.4). */
interface RlsTrendingReasonMeta {
  label: string;
  /** Tailwind classes cho badge (light + dark neon). */
  badgeClass: string;
  /** Emoji/ký hiệu ngắn để nhận diện nhanh. */
  icon: string;
}

/** Map lý do → nhãn tiếng Việt + style badge (fallback khi backend không gửi `reasonLabel`). */
const REASON_META: Record<RlsTrendingReason, RlsTrendingReasonMeta> = {
  crowded: {
    label: 'Đông người',
    icon: '🔥',
    badgeClass:
      'border-orange-400/40 bg-orange-500/10 text-orange-600 dark:text-orange-300 dark:shadow-[0_0_12px_rgba(251,146,60,0.35)]',
  },
  viral: {
    label: 'Lan truyền',
    icon: '⚡',
    badgeClass:
      'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300 dark:shadow-[0_0_12px_rgba(232,121,249,0.35)]',
  },
  event: {
    label: 'Sự kiện',
    icon: '🎉',
    badgeClass:
      'border-cyan-400/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 dark:shadow-[0_0_12px_rgba(34,211,238,0.35)]',
  },
  rising: {
    label: 'Đang lên',
    icon: '📈',
    badgeClass:
      'border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 dark:shadow-[0_0_12px_rgba(16,185,129,0.35)]',
  },
};

/** Meta mặc định khi `reason` không khớp (an toàn với chuỗi backend lạ). */
const DEFAULT_REASON_META: RlsTrendingReasonMeta = {
  label: 'Trending',
  icon: '✨',
  badgeClass:
    'border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300',
};

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Panel trending trong bottom sheet.
 * ─────────────────────────────────────────────────────────────────────────────
 * Presentational standalone component (design.md §9.3 `RlsTrendingPanelComponent`)
 * hiển thị các spot đang trending gần người dùng (kết quả `GET /trending/nearby`
 * | `GET /trending/places`) bên trong `RlsBottomSheetComponent` trên
 * `HomeMapPage` (R2.4). Component **thuần UI**: nhận danh sách đã xếp hạng + gắn
 * lý do qua `@Input items` (design.md §9.3) và phát sự kiện chọn cho page xử lý —
 * không gọi service, không hardcode URL (R14.3).
 *
 * Mỗi spot luôn có **một lý do** (crowded/viral/event/rising, R6.4); panel chỉ
 * render nhãn + badge tương ứng (ưu tiên `reasonLabel` do backend gửi, fallback
 * sang nhãn nội bộ).
 *
 * Style: dark neon glow + light glassmorphism (Tailwind v4, R14.5).
 *
 * _Requirements: 2.4, 14.5 — Design §6.1, §6.5, §9.3_
 */
@Component({
  selector: 'rls-trending-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rls-trending-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsTrendingPanelComponent {
  /** Danh sách spot trending đã xếp hạng + gắn lý do (từ RankingService backend). */
  @Input() items: RlsTrendingPlace[] = [];

  /** Đang nạp dữ liệu → hiện skeleton thay vì empty state. */
  @Input() loading = false;

  /** Phát khi người dùng chọn một spot (mở chi tiết / recenter map). */
  @Output() open = new EventEmitter<RlsTrendingPlace>();

  /** trackBy theo id để Angular không re-render toàn bộ danh sách. */
  trackById(_index: number, item: RlsTrendingPlace): number {
    return item.id;
  }

  /** Phát sự kiện chọn spot. */
  onOpen(item: RlsTrendingPlace): void {
    this.open.emit(item);
  }

  /** Nhãn lý do hiển thị: ưu tiên `reasonLabel` backend → fallback nhãn nội bộ. */
  reasonLabel(item: RlsTrendingPlace): string {
    return item.reasonLabel?.trim() || this.reasonMeta(item.reason).label;
  }

  /** Classes badge theo lý do (an toàn với giá trị ngoài enum). */
  reasonBadgeClass(item: RlsTrendingPlace): string {
    return this.reasonMeta(item.reason).badgeClass;
  }

  /** Icon ngắn theo lý do. */
  reasonIcon(item: RlsTrendingPlace): string {
    return this.reasonMeta(item.reason).icon;
  }

  /** Lấy meta theo lý do, fallback mặc định nếu không khớp enum. */
  private reasonMeta(reason: RlsTrendingReason): RlsTrendingReasonMeta {
    return REASON_META[reason] ?? DEFAULT_REASON_META;
  }
}
