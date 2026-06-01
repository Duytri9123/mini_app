/**
 * REALTIME LOCAL SOCIAL (app-mini) — User & auth contract interfaces.
 * ─────────────────────────────────────────────────────────────────────────────
 * Ánh xạ model `USERS` (design.md §5.1) + role từ `spatie/laravel-permission`
 * (`user|moderator|admin`, design.md §9) và hợp đồng các endpoint `/api/auth/*`
 * (design.md §6.1). Prefix `Rls` để không xung đột với `bro-jet` (`Bj`).
 *
 * Backend trả mọi field theo snake_case bọc trong `{ data, message? }`;
 * `RlsAuthService._normalizeUser` chuẩn hoá về camelCase ở một chỗ duy nhất nên
 * phần còn lại của app chỉ làm việc với hình dạng `RlsUser` ổn định này.
 */

/** Ba role hệ thống (design.md §9 — privilege monotonicity admin ⊇ moderator ⊇ user). */
export type RlsUserRole = 'user' | 'moderator' | 'admin';

export type RlsUserGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

/**
 * User hiện tại (single source of truth ở backend; app chỉ render + dùng cho
 * fallback `home_geohash` khi từ chối quyền vị trí — R2.3).
 */
export interface RlsUser {
  id: number;
  username?: string | null;
  phone?: string | null;
  email: string | null;
  displayName: string;
  age?: number | null;
  gender?: RlsUserGender | string | null;
  avatarUrl?: string | null;
  /** Community campus mặc định (nullable). */
  campusCommunityId?: number | null;
  /** Geohash nhà/khu vực mặc định để center map khi không có quyền vị trí (R2.3). */
  homeGeohash?: string | null;
  /** Vai trò (mặc định `user`). */
  role: RlsUserRole | string;
  /** FCM token cho push (chỉ tham chiếu, không bắt buộc lộ ở client). */
  fcmToken?: string | null;
  lastActiveAt?: string | null; // ISO8601
  createdAt?: string; // ISO8601
  updatedAt?: string; // ISO8601
}

/** Body `POST /auth/register` (design.md §6.1). */
export interface RlsRegisterRequest {
  display_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  username?: string;
}

/** Body `POST /auth/login` (design.md §6.1). */
export interface RlsLoginRequest {
  email: string;
  password: string;
}

export interface RlsPhoneOtpRequest {
  phone: string;
}

export interface RlsPhoneOtpVerifyRequest {
  phone: string;
  otp: string;
}

export interface RlsPhoneProfileRequest {
  phone: string;
  display_name: string;
  age: number;
  gender: RlsUserGender | string;
  otp?: string;
  onboarding_token?: string | null;
}

/**
 * Body `POST /auth/google` (design.md §6.1) — đăng nhập bằng Google.
 * Backend chấp nhận `id_token` (Google Identity) hoặc `code` (OAuth) tuỳ luồng;
 * cả hai đều optional ở type để không khoá cứng client vào một cơ chế.
 */
export interface RlsGoogleRequest {
  id_token?: string;
  code?: string;
  access_token?: string;
}

/**
 * Payload `data` đã bóc bao bì của `register|login|google` — token Sanctum +
 * profile user. Field theo snake_case như backend trả (chưa normalize).
 */
export interface RlsAuthResponseData {
  access_token: string;
  token_type?: string;
  user: unknown;
}

/** Kết quả auth đã normalize cho consumer (token + `RlsUser`). */
export interface RlsAuthResult {
  accessToken: string;
  tokenType: string;
  user: RlsUser;
}

export interface RlsPhoneOtpVerifyResult {
  requiresProfile: boolean;
  onboardingToken: string | null;
  auth: RlsAuthResult | null;
}
