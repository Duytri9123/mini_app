# IMPORTANT: AI ASSISTANT GUIDELINES
> **MANDATORY**: Mỗi khi bắt đầu phiên làm việc hoặc thực hiện nhiệm vụ liên quan đến BRO JET, bạn **PHẢI** đọc file này. Đây là "Kim chỉ nam" về thiết kế, kiến trúc và trải nghiệm người dùng cho hệ thống BRO JET. Tuyệt đối không làm sai lệch các tiêu chuẩn đã đề ra.

# BRO JET - DESIGN SYSTEM & ARCHITECTURE

## 1. BẢN SẮC THIẾT KẾ (VISUAL IDENTITY)

Lấy cảm hứng từ sự kết hợp giữa **Nước (Cyan/Teal)** và **Thiên nhiên (Mint Green)** trên nền sáng trong trẻo (Premium Light Mode).

### 1.1 Bảng Màu (Color Palette)

#### Primary Colors
- **Primary Emerald**: `#10b981` (Emerald 500)
  - *Sử dụng*: Nút bấm chính (CTA), trạng thái đang hoạt động, gradient buttons.
- **Primary Teal**: `#14b8a6` (Teal 500)
  - *Sử dụng*: Gradient kết hợp với Emerald, accent elements.

#### Background & Surface
- **Header Background**: `linear-gradient(135deg, #e8fdf5 0%, #e0f7fa 40%, #f0f9ff 100%)`
  - *Sử dụng*: Header, top bars — gradient mint nhẹ nhàng.
- **Page Background**: `#ffffff` hoặc `#f8fffe` (trắng hơi xanh mint)
  - *Sử dụng*: Nền toàn trang, mang lại cảm giác sạch sẽ, tươi mát.
- **Surface**: `#ffffff` (Nền các card, sidebar, modal — trắng tinh).
- **Auth Background**: `linear-gradient(180deg, #e8fdf5 0%, #e0f7fa 30%, #f0f9ff 60%, #ffffff 100%)`
  - *Sử dụng*: Trang đăng nhập/đăng ký.

#### Button Gradient (CTA chính)
- **Primary Button**: `bg-gradient-to-r from-cyan-500 to-emerald-500`
  - Hover: `from-cyan-600 to-emerald-600`
  - Shadow: `shadow-lg shadow-cyan-200/50`
- **Secondary Button**: `border border-cyan-500 text-cyan-600 bg-white hover:bg-cyan-50`

#### Text Colors
- **Heading**: `#1a1a1a` (gần đen)
- **Body**: `#374151` (gray-700)
- **Muted**: `#6b7280` (gray-500)
- **Brand Name**: `text-primary` (Emerald/Teal)

#### Status Colors
- **Success**: `#10b981` (Emerald)
- **Warning**: `#f59e0b` (Amber)
- **Error**: `#ef4444` (Red 500)
- **Info**: `#06b6d4` (Cyan 500)

### 1.2 Phong Cách Giao Diện (UI Style)
- **Clean & Fresh**: Nền sáng, bóng nhẹ, bo góc lớn (rounded-2xl, rounded-full).
- **Soft Glassmorphism**: `backdrop-filter: blur(12px)` trên header với nền gradient mint mờ.
- **Background Pattern**: Sử dụng `background_header.png` với opacity thấp (0.9) trên header.
- **Shadows**: Bóng nhẹ, tự nhiên — `shadow-sm`, `shadow-lg shadow-emerald-200`.
- **Typography**: Font chữ hiện đại, không chân (Inter/Montserrat). Font-weight: bold/black cho headings.
- **Border**: Viền siêu mảnh `border-gray-200` hoặc `border-slate-100`.

### 1.3 Safe Area (Mobile App)
- **Header**: `padding-top: calc(env(safe-area-inset-top, 0px) - 8px)` — trừ 8px cho gọn trên app.
- **Map Overlays (Search/Filter)**: `top: calc(env(safe-area-inset-top, 0px) + 0.5rem)` — đẩy xuống dưới notch.
- **Bottom Sheet**: Luôn có `pb-16` hoặc `padding-bottom: env(safe-area-inset-bottom)`.

---

## 2. KIẾN TRÚC FRONTEND (ANGULAR/IONIC)

### 2.1 Cấu Trúc Module
Toàn bộ code nằm trong `src/app/bro-jet/`, tách biệt hoàn toàn với các module khác.
- `core/`: Services, Interfaces, Constants, Utils.
- `shared/`: UI Components dùng chung (bj-map, bj-station-card, bj-wash-progress...).
- `pages/`: Các trang chức năng (Home, Booking, Wallet...).
- `layout/`: Header, Sidebar, Bottom Navigation.

### 2.2 Nguyên Tắc Phát Triển
1. **Prefix**: Tất cả component, service, variable phải có tiền tố `bj-` (ví dụ: `bj-header`, `var(--bj-primary)`).
2. **Clean Code**: Không duplicate logic. Tái sử dụng các utils đã có.
3. **State Management**: Sử dụng `BehaviorSubject` trong services để quản lý state (ví dụ: `selectedStation$`).
4. **Standalone Components**: Ưu tiên standalone components với explicit imports.

### 2.3 Button Standards
```html
<!-- Primary CTA -->
<button class="px-5 py-2 text-sm font-bold rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:from-cyan-600 hover:to-emerald-600 shadow-lg shadow-cyan-200/50 transition-all">
  Label
</button>

<!-- Secondary / Outline -->
<button class="px-5 py-2 text-sm font-bold rounded-full border-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 transition-colors">
  Label
</button>

<!-- Ghost / Link -->
<button class="text-sm font-semibold text-cyan-600 hover:text-cyan-700 transition-colors">
  Label
</button>
```

---

## 3. CƠ CHẾ VẬN HÀNH (CORE LOGIC)

### 3.1 Luồng Rửa Xe
- Đặt lịch -> Thanh toán (Ví/QR) -> Check-in (LPR/Manual) -> Kích hoạt thiết bị (IoT/MQTT) -> Theo dõi tiến độ realtime.

### 3.2 Tích Hợp IoT
- Giao tiếp qua MQTT.
- Topic: `station/{id}/device/{id}/telemetry`
- Các trạng thái: `START_WASH`, `IN_PROGRESS`, `WASH_COMPLETE`, `ERROR`.

### 3.3 Authentication
- **Google Sign-In**: Web (Google Identity Services SDK) + Native (@capgo/capacitor-social-login).
- **OTP**: Firebase Phone Auth — hoạt động trên cả web và native app.
- **Password**: Phone + password login qua backend API.

---

## 4. QUY TẮC DÀNH CHO DEVELOPER/AI
- Luôn ưu tiên giao diện **sạch, tươi mát, chuyên nghiệp** ngay từ cái nhìn đầu tiên.
- Luôn kiểm tra tính tương thích Responsive trên Mobile.
- **KHÔNG dùng màu blue mặc định** (`bg-blue-600`) cho buttons — dùng gradient cyan → emerald (`from-cyan-500 to-emerald-500`).
- Mọi overlay trên map phải có `safe-area-inset-top` để tránh bị notch che.
- Header phải có background pattern + gradient mint.
- Khi tạo Component mới, dùng standalone component.
- Mọi biến màu sắc phải nhất quán với hệ màu Emerald/Teal/Mint đã định nghĩa.
- **KHÔNG dùng `material-symbols-outlined`** (Google Material Icons font) — luôn dùng **SVG icons** từ registry `BJ_ICONS` (`src/app/bro-jet/shared/icons/bj-icons.ts`).

### 4.1 Icon Standards (SVG Only)
- **Registry**: Tất cả icon được quản lý tập trung tại `src/app/bro-jet/shared/icons/bj-icons.ts`.
- **Render**: Sử dụng `[innerHTML]="icon('KEY')"` (với method `icon()` trả về `SafeHtml`) hoặc `[innerHTML]="icons.KEY | safeSvg"` (với pipe `SafeSvgPipe`).
- **Sizing**: Dùng Tailwind classes `w-{size} h-{size}` trên thẻ `<span>` chứa SVG (VD: `w-5 h-5`, `w-4.5 h-4.5`).
- **Color**: SVG dùng `stroke="currentColor"` hoặc `fill="currentColor"` — điều khiển màu qua `text-{color}` class trên parent.
- **Import**: Component phải import `SafeSvgPipe` và `BJ_ICONS` / `BjIconKey`.

```html
<!-- ✅ ĐÚNG: Dùng SVG từ BJ_ICONS -->
<span class="w-5 h-5 text-emerald-500" [innerHTML]="icon('CAR')"></span>
<span class="w-4 h-4 text-cyan-500" [innerHTML]="icon('BADGE')"></span>

<!-- ❌ SAI: Không dùng Material Symbols font -->
<span class="material-symbols-outlined">directions_car</span>
```

```typescript
// Component setup
import { BJ_ICONS, BjIconKey } from '../../shared/icons/bj-icons';
import { SafeSvgPipe } from '../../shared/pipes/safe-svg.pipe';

@Component({
  imports: [..., SafeSvgPipe],
})
export class MyComponent {
  private readonly safeIcons = new Map<BjIconKey, SafeHtml>();

  icon(key: BjIconKey): SafeHtml {
    const cached = this.safeIcons.get(key);
    if (cached) return cached;
    const safe = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS[key]);
    this.safeIcons.set(key, safe);
    return safe;
  }
}
```
