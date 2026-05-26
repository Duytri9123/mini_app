# GapMove Design Brief

## Positioning

GapMove is a delivery-first logistics app. The main service is fast delivery, with ride booking, truck/van, mini moving, and porter help as supporting services.

Primary user promise: enter pickup and drop-off, choose a delivery service, get a price estimate, and create an order quickly.

Reference direction:
- Ahamove: delivery-first product, clear service menu, order history, account/benefits/support groups, app-like mobile navigation.
- Lalamove: desktop booking flow with a left order panel and a large map on the right.
- GapMove differentiation: built-in "Bê hộ hàng" as an independent add-on or a standalone service.

## Brand

Use the logo at `src/assets/images/logo_gapmove.png`.

Brand colors:
- Primary green/teal: `#008c95`
- Primary dark: `#006f76`
- Orange accent: `#ff5a00`
- Text: `#0f172a`
- Muted text: `#64748b`
- Page background: `#f8fafc`
- Card border: `#e2e8f0`

Button rule:
- Primary buttons must be green/teal (`#008c95`), not orange.
- Orange is only an accent for labels, promotion badges, warnings, porter highlights, or brand emphasis.
- Destructive actions can use red.
- Secondary buttons use white/transparent background with teal text or slate text.

## Information Architecture

Primary routes:
- `/gap-move/home`: main page. Desktop behaves like a full product homepage; mobile behaves like the app home.
- `/gap-move/booking/new`: create order. Default service is `delivery`.
- `/gap-move/deliveries`: delivery management.
- `/gap-move/bookings`: order history/current orders.
- `/gap-move/truck`: truck/van order mode.
- `/gap-move/moving`: mini moving mode.
- `/gap-move/carry`: porter/help-carrying mode.
- `/gap-move/wallet`: wallet/payment.
- `/gap-move/settings`: full settings/account center.
- `/gap-move/business`: business solution page.

Service priority:
1. Giao hàng nhanh
2. Đa đơn - Đa điểm
3. Đặt xe
4. Xe tải / xe van
5. Chuyển nhà mini
6. Bê hộ hàng

## Desktop Home

Desktop Home is the main marketing/product page. Do not add a footer.

Top section:
- Left: grouped delivery-first hero/banner block, not disconnected headline and banner blocks.
- Right: quick order card.
- Quick card must include pickup, drop-off, map-picker icon inside each address row, suggestions, and a green primary CTA.
- Do not place standalone locate/map icon buttons in the quick-card header.
- Keep supporting copy minimal; avoid slogan-like body copy under the first headline.

Below the first viewport:
- Service cards.
- Current active orders.
- Platform introduction using `gapmove-1.jpg`, `gapmove-2.jpg`, `gapmove-3.jpg`, `gapmove-4.jpg`.
- Customer segments: personal, online shop, business, porter-help users.
- Order flow steps: address, service/vehicle, price/payment, tracking.
- Business CTA section.
- App download CTA near the bottom, using App Store and Google Play badges. It is a marketing banner, not a footer.

Desktop should feel operational and trustworthy, not decorative. Use large images only when they show the service, delivery, truck, or handling context.

## Mobile Home

Mobile is an app, not a landing page.

Mobile first screen:
- Header with logo/profile/notifications.
- Banner carousel.
- Prominent address card:
  - pickup defaults to current location when permission is granted.
  - drop-off can be typed or selected on map.
  - address input shows suggestions.
  - mobile quick card should not place extra location/map action buttons in the header; keep map actions inside each address row.
  - address values should have enough width/height for long reverse-geocoded names, preferably two visible lines on mobile.
- Horizontal compact service list.
- Active order cards.
- Article/news cards for delivery tips and GapMove updates.
- Bottom tab navigation.

Keep long product/marketing sections hidden on mobile.

## Booking Flow

Default booking type must be `delivery`.

Desktop booking:
- Split layout:
  - far left: compact service rail with service icons and tooltips.
  - left: order panel.
  - right: full-height map.
- Route/address section appears first.
- Service selector appears after address.
- Service selector is compact; on mobile it is horizontally scrollable.
- Primary submit button is green.

Mobile booking:
- Address first.
- Service selector as horizontal cards.
- Vehicle/options below.
- Price summary and submit at bottom.

Address behavior:
- Pickup should try browser geolocation and reverse geocode.
- User can type to get VietMap suggestions.
- User can open map picker and click/tap map to select pickup/drop-off.
- Selected coordinates should be passed from Home to Booking with query params where possible.
- Never show raw coordinates as the pickup display label. Show the reverse-geocoded address; if that fails, use a friendly fallback such as "Chưa xác định được địa chỉ hiện tại" or prompt the user to enter/select pickup.

## Service Details

Giao hàng nhanh:
- Main service.
- Supports documents, parcels, multiple stops, COD, declared value, fragile goods, insurance, cold chain notes.
- Recommended vehicle: motorbike by default.

Xe tải / xe van:
- For bulky goods, shop inventory, and small business logistics.
- Recommended vehicles: van and truck.

Chuyển nhà mini:
- Includes packing, assembly/disassembly, porter help.
- Should preselect porter-related add-ons.

Bê hộ hàng:
- Can be standalone or add-on.
- Options: helper count, floor count, elevator, heavy items, bulky items, carrying distance, one-way/two-way.

Đa đơn - Đa điểm:
- Dedicated route `/gap-move/multi-stop`.
- Use a table-style desktop flow with sender info, delivery-point rows, COD, package dimensions, filter dropdowns, row action menu, and a step header.
- Step 1: enter delivery rows and choose service/address inline.
- Step 2: choose route grouping or manual optimization with pickup schedule/note.
- Step 3: review route, fee, COD, and create the grouped order.
- Header is owned by the page; do not show the marketing header here.

Đặt xe:
- Secondary service.
- Keep available but never visually outrank delivery.

Drivers:
- Do not label the page as "Tài xế gần bạn".
- Use mock driver data that updates coordinates over time so map markers move continuously in demos.

## Navigation And Menus

Desktop:
- Top nav uses a web header, not an app/admin nav.
- The web header appears only on `/gap-move/home`.
- Other pages use the old app-style header, except specialized order/map flows that own their full-screen layout.
- Left logo links to Home.
- `Đặt đơn` is a primary text action and navigates to `/gap-move/booking/new`; it must not just return to Home.
- Menu groups use dropdowns:
  - Dịch vụ: Giao hàng nhanh, Xe tải / xe van, Đa đơn - Đa điểm, Bê hộ hàng, Chuyển nhà mini.
  - Khách hàng: Khách hàng cá nhân, Khách hàng doanh nghiệp, Ưu đãi & thành viên, Trung tâm hỗ trợ.
  - Tài xế: Đăng ký tài xế mới, Cộng đồng tài xế, Cẩm nang tài xế, Chương trình xe điện 2026.
  - Tuyển dụng: Về chúng tôi, Câu chuyện GapMovers, Gia nhập GapMove ngay.
  - Tin tức: Tin tức GapMove, Thông tin dịch vụ, Blog kinh doanh, Báo cáo.
- Right side has account/login and register actions.
- When authenticated, hide `Đăng ký`; show a compact account chip with avatar/initial and a hover/focus account popover.
- Web has no footer.

Mobile:
- Bottom tabs: Home, Đơn, QR, Ví, Cài đặt.
- If a side menu is added later, group items like:
  - Dịch vụ: Giao hàng, Xe máy, Xe tải, Liên tỉnh, Chuyển nhà, Đa đơn - Đa điểm.
  - Đơn hàng: Lịch sử đơn hàng, Đơn hàng nháp, Tài xế yêu thích.
  - Tài khoản: Tài khoản của tôi, Thống kê, Thành viên.
  - Quyền lợi: Gói hội viên, Đổi quà.
  - Hỗ trợ & Tin tức: Giới thiệu bạn bè, Tin tức, Trung tâm trợ giúp, GapMove Insights.

## Component Rules

Cards:
- Border radius: 16-24px for app cards, 12-16px for dense desktop cards.
- Avoid card-inside-card except for modals or framed tools.
- Use subtle border `#e2e8f0` and light shadow.

Buttons:
- Primary: green background, white text.
- Secondary: white/transparent, teal or slate text.
- Icon buttons: use `ion-icon` where available.

Forms:
- Inputs must be large enough for mobile.
- Labels are uppercase, small, and muted.
- Suggestions use small list rows with clear hover/tap target.

Map:
- Use VietMap/OpenMap style through `environment.VIETMAP_API_KEY`.
- Desktop booking map should be full height on the right.
- Picker mode must include address search, a "vị trí của tôi" action, click/tap selection, and an explicit confirmation button. Selecting a point must not close the picker until the user confirms.

## Content Tone

Use Vietnamese copy.

Tone:
- Direct, operational, service-focused.
- Avoid over-marketing.
- Emphasize delivery speed, reliability, address/map workflow, order tracking, COD, and porter support.

Preferred phrases:
- "Giao hàng nhanh"
- "Tạo đơn giao hàng"
- "Chọn trên bản đồ"
- "Điểm lấy / đón"
- "Điểm giao / đến"
- "Bê hộ hàng"
- "Theo dõi trạng thái đơn"

Avoid making GapMove sound primarily like a ride-hailing app. Ride booking is secondary.
