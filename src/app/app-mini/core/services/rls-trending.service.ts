import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { RlsApiService } from './rls-api.service';
import { RLS_API } from '../constants/rls-config.constants';
import {
  RlsTrendingNearbyQuery,
  RlsTrendingPlace,
  RlsTrendingPlacesQuery,
  RlsTrendingReason,
} from '../interfaces';

/**
 * REALTIME LOCAL SOCIAL (app-mini) — Trending / hot places service.
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton (`providedIn: 'root'`) cung cấp **nearby trending** và **top hot
 * places** cho `TrendingPage` + `RlsTrendingPanelComponent` / `RlsTrendingCard
 * Component` (design.md §9.3, §6.7). Mirror cách `RlsFeedService`/`RlsStory
 * Service` giữ state qua `BehaviorSubject` và lấy mọi đường dẫn từ `RLS_API`
 * (single source of truth) — KHÔNG hardcode URL (host từ `API_URL` qua
 * `RlsApiService`, R14.3). Service KHÔNG vẽ UI và KHÔNG biết base URL.
 *
 * **Single source of truth ở backend.** Trending là kết quả đã được
 * `RankingService` của backend tính sẵn và **cache** (recompute định kỳ qua
 * scheduled queue job — R6.5, design.md §10.3 `UpdateRankings`/`Recompute
 * HeatmapDecay`). Client **chỉ render**: không tự xếp hạng, không tự suy luận độ
 * hot. Mỗi spot đã được backend annotate **một lý do** (`crowded`/`viral`/
 * `event`/`rising` — R6.4); service chỉ chuẩn hoá nhẹ để đảm bảo trường `reason`
 * luôn hợp lệ cho lớp trình bày (component đã có fallback nhãn/style).
 *
 * Hai nhiệm vụ (Requirement 6 + 11.2):
 *  1. **Nearby trending** (R6.1, R6.4) — {@link loadNearby}
 *     (`GET /trending/nearby?lat=&lng=`) trả hot/viral/event/rising spots gần
 *     người dùng. Lọc bán kính + xếp hạng do backend đảm nhiệm (R6.2, R6.5);
 *     client chỉ phát state `nearby$`.
 *  2. **Top hot places** (R11.2) — {@link loadPlaces}
 *     (`GET /trending/places?scope=`) trả bảng xếp hạng hot places; phát state
 *     `places$`.
 *
 * _Requirements: 6.1, 6.4, 6.5, 11.2_
 * _Design: 9.4 Core services — RlsTrendingService; 6.7 Trending & Ranking; 9.3 Trending components_
 */
@Injectable({ providedIn: 'root' })
export class RlsTrendingService {
  private readonly api = inject(RlsApiService);

  /** Hot/viral/event/rising spots gần người dùng (`GET /trending/nearby`). */
  readonly nearby$ = new BehaviorSubject<RlsTrendingPlace[]>([]);

  /** Top hot places theo scope (`GET /trending/places`). */
  readonly places$ = new BehaviorSubject<RlsTrendingPlace[]>([]);

  /** Đang nạp (nearby hoặc places) — cho spinner/skeleton. */
  readonly loading$ = new BehaviorSubject<boolean>(false);

  // ──────────────────────────── Nearby trending (R6.1) ────────────────────────

  /**
   * Nạp **hot/viral spots gần bạn** (`GET /trending/nearby?lat=&lng=`, R6.1).
   * Danh sách đã được backend lọc bán kính + xếp hạng + annotate `reason` (cached
   * `RankingService` — R6.4, R6.5); service chỉ chuẩn hoá `reason` và phát
   * `nearby$`. Trả về stream danh sách spot đã chuẩn hoá.
   */
  loadNearby(query: RlsTrendingNearbyQuery): Observable<RlsTrendingPlace[]> {
    this.loading$.next(true);

    return this.api
      .get<RlsTrendingPlace[]>(RLS_API.TRENDING_NEARBY, {
        lat: query.lat,
        lng: query.lng,
        radius: query.radiusM,
        limit: query.limit,
      })
      .pipe(
        map((data) => normalizeTrending(data)),
        tap({
          next: (items) => {
            this.nearby$.next(items);
            this.loading$.next(false);
          },
          error: () => this.loading$.next(false),
        }),
      );
  }

  // ───────────────────────────── Top hot places (R11.2) ───────────────────────

  /**
   * Nạp **top hot places** (`GET /trending/places?scope=`, R11.2). Kết quả đã
   * xếp hạng + annotate `reason` ở backend (cached); service chỉ chuẩn hoá và
   * phát `places$`. Trả về stream danh sách place đã chuẩn hoá.
   */
  loadPlaces(query: RlsTrendingPlacesQuery = {}): Observable<RlsTrendingPlace[]> {
    this.loading$.next(true);

    return this.api
      .get<RlsTrendingPlace[]>(RLS_API.TRENDING_PLACES, {
        scope: query.scope,
        ref: query.ref,
        limit: query.limit,
      })
      .pipe(
        map((data) => normalizeTrending(data)),
        tap({
          next: (items) => {
            this.places$.next(items);
            this.loading$.next(false);
          },
          error: () => this.loading$.next(false),
        }),
      );
  }

  // ─────────────────────────────── Accessors ──────────────────────────────────

  /** Danh sách nearby trending hiện tại (đồng bộ). */
  getNearby(): RlsTrendingPlace[] {
    return this.nearby$.getValue();
  }

  /** Danh sách top hot places hiện tại (đồng bộ). */
  getPlaces(): RlsTrendingPlace[] {
    return this.places$.getValue();
  }

  /** Dọn toàn bộ state trending (vd rời trang) — reset nearby + places. */
  reset(): void {
    this.nearby$.next([]);
    this.places$.next([]);
  }
}

// ── module-level pure helpers (export để unit-test trực tiếp) ────────────────

/** Tập lý do trending hợp lệ (design.md §6.7, R6.4). */
const VALID_REASONS: ReadonlySet<RlsTrendingReason> = new Set<RlsTrendingReason>([
  'crowded',
  'viral',
  'event',
  'rising',
]);

/** Lý do mặc định khi backend không annotate (an toàn cho lớp trình bày). */
const DEFAULT_REASON: RlsTrendingReason = 'rising';

/**
 * Chuẩn hoá danh sách trending từ backend: bỏ phần tử rỗng và đảm bảo mỗi spot
 * có `reason` hợp lệ (R6.4 — "mỗi spot phải có lý do"). KHÔNG xếp hạng lại / lọc
 * bán kính (đó là việc của backend — single source of truth); chỉ giữ thứ tự
 * backend trả về. Hàm thuần.
 */
export function normalizeTrending(
  data: readonly RlsTrendingPlace[] | null | undefined,
): RlsTrendingPlace[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .filter((item): item is RlsTrendingPlace => item != null)
    .map((item) => ensureReason(item));
}

/** Đảm bảo spot có `reason` thuộc enum hợp lệ, fallback `rising` nếu thiếu/lạ. */
export function ensureReason(place: RlsTrendingPlace): RlsTrendingPlace {
  if (VALID_REASONS.has(place.reason)) {
    return place;
  }
  return { ...place, reason: DEFAULT_REASON };
}
