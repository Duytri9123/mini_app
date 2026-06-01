/**
 * story-expiry.util.ts — Hàm thuần (pure) cho vòng đời story 24h.
 *
 * Phản chiếu logic backend (`StoryObserver@creating` đặt `expires_at = created_at + 24h`
 * và `RlsStoryService.isStoryActive`). Tách thành hàm thuần để property-based testing
 * (task 13.5 — Property 5: Story expiry invariants) có thể kiểm chứng các bất biến:
 *
 *   ∀ story s:  s.expires_at == s.created_at + 24h
 *   ∀ now:      isStoryActive(s, now) == (s.status === 'active' ∧ now < s.expires_at)
 *
 * Không side-effect: không đọc đồng hồ hệ thống, không I/O. `now` luôn được truyền vào.
 *
 * _Requirements: 8.1, 8.2, 8.4, 15.1_
 * _Design: 11.5 Story expiry, 13 Property 5_
 */

import { RLS_STORY_TTL_MS } from '../constants/rls-config.constants';

/** Thời gian sống của một story tính bằng giờ (bất biến nghiệp vụ). */
export const STORY_TTL_HOURS = 24;

/**
 * Thời gian sống của một story tính bằng mili-giây (24h).
 * Tái sử dụng hằng số chuẩn `RLS_STORY_TTL_MS` (rls-config.constants) để tránh
 * trùng lặp magic-number — design §6.6/§11.5, Property 5.
 */
export const STORY_TTL_MS = RLS_STORY_TTL_MS;

/** Trạng thái vòng đời story (khớp cột `status` ở backend). */
export type StoryStatus = 'active' | 'expired' | 'removed';

/**
 * Một mốc thời gian chấp nhận được làm đầu vào:
 * - `number`  → epoch mili-giây
 * - `string`  → chuỗi ISO-8601 (vd. `2024-01-01T00:00:00.000Z`)
 * - `Date`    → đối tượng Date
 */
export type TimeInput = number | string | Date;

/**
 * Phần tối thiểu của một Story cần cho việc xác định còn hiệu lực.
 * Dùng kiểu cấu trúc (structural) để không phụ thuộc interface `Story` đầy đủ
 * (sẽ được định nghĩa ở task 10.2), giữ util thuần và độc lập.
 */
export interface StoryExpiryView {
  status: StoryStatus;
  /** Mốc hết hạn — ISO string (mặc định backend), epoch ms hoặc Date. */
  expiresAt: TimeInput;
}

/**
 * Chuẩn hóa một mốc thời gian về epoch mili-giây.
 * Trả về `NaN` nếu đầu vào không hợp lệ (chuỗi không parse được, Date Invalid...).
 */
function toEpochMs(value: TimeInput): number {
  if (typeof value === 'number') {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  // string ISO-8601
  return Date.parse(value);
}

/**
 * Tính mốc hết hạn của story = thời điểm tạo + 24h.
 *
 * Thuần: cùng đầu vào luôn cho cùng đầu ra; không phụ thuộc đồng hồ hệ thống.
 *
 * @param createdAt thời điểm tạo (epoch ms, ISO string hoặc Date).
 * @returns epoch mili-giây của mốc hết hạn (`createdAt + 24h`); `NaN` nếu `createdAt` không hợp lệ.
 */
export function computeExpiresAt(createdAt: TimeInput): number {
  const createdMs = toEpochMs(createdAt);
  return createdMs + RLS_STORY_TTL_MS;
}

/**
 * Xác định một story còn hiệu lực hay không tại thời điểm `now`.
 *
 * Story active ⟺ `status === 'active'` VÀ `now < expiresAt` (so sánh chặt:
 * đúng tại mốc hết hạn được coi là đã hết hạn).
 *
 * Thuần: `now` được truyền vào, không gọi `Date.now()` bên trong.
 *
 * @param story phần story chứa `status` và `expiresAt`.
 * @param now thời điểm hiện tại (epoch ms, ISO string hoặc Date).
 * @returns `true` nếu story đang active tại `now`; ngược lại `false`.
 */
export function isStoryActive(story: StoryExpiryView, now: TimeInput): boolean {
  if (story.status !== 'active') {
    return false;
  }
  const nowMs = toEpochMs(now);
  const expiresMs = toEpochMs(story.expiresAt);
  // Nếu một trong hai mốc không hợp lệ (NaN), mọi so sánh đều false → coi như không active.
  return nowMs < expiresMs;
}
