/**
 * time-ago.pipe.ts — REALTIME LOCAL SOCIAL (app-mini)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pipe standalone định dạng **thời gian tương đối** ("vừa xong", "5 phút trước",
 * "2 giờ trước"…) cho feed card, story, notification… (design.md §9.2 —
 * `shared/pipes/time-ago.pipe.ts`). Thay thế việc render thô `{{ post.createdAt }}`
 * (chuỗi ISO) bằng nhãn dễ đọc, nhất quán toàn module.
 *
 * Logic định dạng tách thành hàm thuần `formatTimeAgo` (không gọi `Date.now()`
 * ngầm khi `now` được truyền vào) để dễ unit-test xác định. Pipe mặc định
 * (`pure: true`) — chỉ tính lại khi tham chiếu đầu vào đổi; phù hợp hiển thị
 * danh sách feed/story.
 *
 * _Requirements: 14.5 (UI Tailwind v4, component nhỏ tái sử dụng)_
 * _Design: 9.2 Cấu trúc thư mục — shared/pipes/time-ago.pipe.ts_
 */
import { Pipe, PipeTransform } from '@angular/core';

/**
 * Mốc thời gian chấp nhận được:
 * - `number`  → epoch mili-giây
 * - `string`  → chuỗi ISO-8601 (mặc định backend Laravel)
 * - `Date`    → đối tượng Date
 * - `null/undefined` → coi như không có giá trị (trả chuỗi rỗng)
 */
export type RlsTimeInput = number | string | Date | null | undefined;

/** Số mili-giây cho từng đơn vị thời gian. */
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Chuẩn hóa mốc thời gian về epoch ms; trả `NaN` nếu không hợp lệ. */
function toEpochMs(value: RlsTimeInput): number {
  if (value == null) {
    return Number.NaN;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return Date.parse(value);
}

/** Định dạng ngày tuyệt đối `dd/MM/yyyy` cho mốc quá xa (>~ vài tuần). */
function formatAbsoluteDate(epochMs: number): string {
  const d = new Date(epochMs);
  const day = `${d.getDate()}`.padStart(2, '0');
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

/**
 * Hàm thuần: định dạng khoảng cách thời gian giữa `value` và `now` thành nhãn
 * tiếng Việt dễ đọc.
 *
 * Quy tắc (theo độ lớn của khoảng cách quá khứ):
 * - đầu vào không hợp lệ            → `''`
 * - tương lai hoặc < 60 giây        → `'vừa xong'`
 * - < 60 phút                       → `'{n} phút trước'`
 * - < 24 giờ                        → `'{n} giờ trước'`
 * - < 7 ngày                        → `'{n} ngày trước'`
 * - < 4 tuần                        → `'{n} tuần trước'`
 * - còn lại                         → ngày tuyệt đối `dd/MM/yyyy`
 *
 * @param value mốc thời gian cần hiển thị.
 * @param now   mốc "hiện tại" (mặc định `Date.now()` nếu không truyền).
 */
export function formatTimeAgo(value: RlsTimeInput, now?: RlsTimeInput): string {
  const targetMs = toEpochMs(value);
  if (Number.isNaN(targetMs)) {
    return '';
  }

  const nowMs = now == null ? Date.now() : toEpochMs(now);
  if (Number.isNaN(nowMs)) {
    return '';
  }

  const diffMs = nowMs - targetMs;

  // Tương lai hoặc rất gần hiện tại → "vừa xong".
  if (diffMs < MS_PER_MINUTE) {
    return 'vừa xong';
  }
  if (diffMs < MS_PER_HOUR) {
    return `${Math.floor(diffMs / MS_PER_MINUTE)} phút trước`;
  }
  if (diffMs < MS_PER_DAY) {
    return `${Math.floor(diffMs / MS_PER_HOUR)} giờ trước`;
  }
  if (diffMs < MS_PER_WEEK) {
    return `${Math.floor(diffMs / MS_PER_DAY)} ngày trước`;
  }
  if (diffMs < 4 * MS_PER_WEEK) {
    return `${Math.floor(diffMs / MS_PER_WEEK)} tuần trước`;
  }
  return formatAbsoluteDate(targetMs);
}

@Pipe({
  name: 'rlsTimeAgo',
  standalone: true,
})
export class RlsTimeAgoPipe implements PipeTransform {
  /**
   * @param value mốc thời gian (ISO string / epoch ms / Date).
   * @param now   (tuỳ chọn) mốc hiện tại — chủ yếu phục vụ test xác định.
   * @returns nhãn thời gian tương đối, `''` nếu đầu vào không hợp lệ.
   */
  transform(value: RlsTimeInput, now?: RlsTimeInput): string {
    return formatTimeAgo(value, now);
  }
}
