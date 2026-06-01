import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { RLS_MAP } from '../../../core/constants/rls-config.constants';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Thanh tìm kiếm glassmorphism.
 * ─────────────────────────────────────────────────────────────────────────────
 * Presentational standalone component (design.md §9.3 `RlsSearchBarComponent`)
 * trên `HomeMapPage` / `RlsHeaderComponent` (R2.4). Người dùng gõ để tìm khu vực
 * / địa điểm; component **debounce** input rồi phát `@Output query` (design.md
 * §9.3) — page sẽ tự gọi geocoding / search API (component không gọi service,
 * không hardcode URL, R14.3).
 *
 * Style: glassmorphism (blur + viền mờ) cho light mode, neon glow cho dark mode
 * qua Tailwind v4 utilities (R14.5). Debounce dùng `RLS_MAP.VIEWPORT_DEBOUNCE_MS`
 * (single source of truth) để nhất quán với nhịp refetch viewport.
 *
 * _Requirements: 2.4, 14.5 — Design §6.1, §9.3_
 */
@Component({
  selector: 'rls-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rls-search-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsSearchBarComponent implements OnInit, OnDestroy {
  /** Placeholder hiển thị khi chưa nhập. */
  @Input() placeholder = 'Tìm khu vực, quán, sự kiện…';

  /** Giá trị khởi tạo (vd khôi phục từ state page). */
  @Input() value = '';

  /** Debounce (ms) trước khi phát query — mặc định bằng nhịp refetch viewport. */
  @Input() debounceMs = RLS_MAP.VIEWPORT_DEBOUNCE_MS;

  /** Phát chuỗi tìm kiếm (đã debounce + khử trùng lặp liên tiếp). */
  @Output() query = new EventEmitter<string>();

  /** Phát khi người dùng bấm nút xoá (clear) — page có thể reset kết quả. */
  @Output() cleared = new EventEmitter<void>();

  /** Trạng thái focus để tăng cường glow viền khi đang gõ. */
  focused = false;

  private readonly input$ = new Subject<string>();

  ngOnInit(): void {
    this.input$
      .pipe(debounceTime(Math.max(0, this.debounceMs)), distinctUntilChanged())
      .subscribe((text) => this.query.emit(text));
  }

  ngOnDestroy(): void {
    this.input$.complete();
  }

  /** ngModelChange → đẩy vào pipeline debounce. */
  onInput(text: string): void {
    this.value = text;
    this.input$.next(text.trim());
  }

  /** Xoá nhanh ô tìm kiếm và phát query rỗng + sự kiện cleared. */
  clear(): void {
    this.value = '';
    this.input$.next('');
    this.cleared.emit();
  }
}
