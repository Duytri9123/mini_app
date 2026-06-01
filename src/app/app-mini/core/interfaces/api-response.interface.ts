/**
 * REALTIME LOCAL SOCIAL (app-mini) — Hợp đồng response chuẩn của backend.
 *
 * Backend (Laravel `Mini_admin`) trả mọi JSON theo bao bì chuẩn
 * `{ data, meta?, message? }` (design.md §6 — "Response chuẩn JSON
 * `{ data, meta?, message? }`"). `RlsApiService` bóc lớp này để service/feature
 * chỉ làm việc với payload `data` đã typed; `meta` (cursor pagination) và
 * `message` được truy cập qua biến thể `*Envelope`.
 *
 * Single source of truth cho hình dạng envelope — đặt trong `core/interfaces`
 * cùng các kiểu domain khác (mirror convention `bro-jet`).
 */

/**
 * Metadata kèm theo response — chủ yếu cho cursor pagination
 * (`GET /api/feed?...cursor=`, design.md §6.4) và thông tin phân trang khác.
 * Để mở (`[key: string]: unknown`) vì backend có thể thêm field tuỳ endpoint.
 */
export interface RlsApiMeta {
  /** Con trỏ trang kế tiếp (cursor pagination). `null` khi đã hết. */
  nextCursor?: string | null;
  /** Con trỏ trang trước (nếu backend hỗ trợ hai chiều). */
  prevCursor?: string | null;
  /** Tổng số bản ghi (nếu endpoint trả về). */
  total?: number;
  /** Số phần tử mỗi trang. */
  perPage?: number;
  [key: string]: unknown;
}

/**
 * Bao bì response chuẩn `{ data, meta?, message? }`.
 * `T` là kiểu payload nghiệp vụ (ví dụ `RlsPost[]`, `RlsLocation`).
 */
export interface RlsApiEnvelope<T = unknown> {
  /** Payload nghiệp vụ chính. */
  data: T;
  /** Metadata tuỳ chọn (pagination...). */
  meta?: RlsApiMeta;
  /** Thông điệp tuỳ chọn từ server (thành công/cảnh báo). */
  message?: string;
}
