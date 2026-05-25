import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { bjAuthGuard } from './core/guards/bj-auth.guard';

/**
 * BRO JET – AUTO SPA routing
 * ─────────────────────────────────────────────────────────────────────────────
 * Toàn bộ cấu hình header/footer được khai báo tập trung qua data:{} của route:
 *   title            – tiêu đề hiển thị trên header
 *   showBack         – hiện nút quay lại
 *   hideUser         – ẩn avatar/tên user trên header
 *   hideHeader       – ẩn toàn bộ header
 *   hideFooter       – ẩn toàn bộ footer
 *   isMapPage        – tắt overflow để map chiếm toàn màn hình
 *   isAuthPage       – trang xác thực (không hiện user section)
 *   showNotification – hiện icon thông báo trên header
 * ─────────────────────────────────────────────────────────────────────────────
 */
const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/bj-layout/bj-layout.component').then(
        (m) => m.BjLayoutComponent,
      ),
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },

      // ── Auth pages (không header, không footer) ───────────────────────────
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/auth/bj-login-auth/bj-login-auth').then((m) => m.BjLoginAuthPage),
        data: { title: 'Đăng nhập', isAuthPage: true, hideHeader: true, hideFooter: true, showNotification: false },
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/auth/bj-register/bj-register.page').then(
            (m) => m.BjRegisterPage,
          ),
        data: { title: 'Đăng ký', isAuthPage: true, hideHeader: true, hideFooter: true, showNotification: false },
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./pages/auth/bj-forgot-password/bj-forgot-password.page').then(
            (m) => m.BjForgotPasswordPage,
          ),
        data: { title: 'Quên mật khẩu', isAuthPage: true, hideHeader: true, hideFooter: true, showNotification: false },
      },
      {
        path: 'verify-otp',
        loadComponent: () =>
          import('./pages/auth/bj-verify-otp/bj-verify-otp.page').then(
            (m) => m.BjVerifyOtpPage,
          ),
        data: { title: 'Xác thực OTP', isAuthPage: true, hideHeader: true, hideFooter: true, showNotification: false },
      },
      {
        path: 'setup-profile',
        loadComponent: () =>
          import('./pages/auth/bj-setup-profile/bj-setup-profile.page').then(
            (m) => m.BjSetupProfilePage,
          ),
        data: { title: 'Thiết lập thông tin', isAuthPage: true, hideHeader: true, hideFooter: true, showNotification: false },
      },
      {
        path: 'welcome',
        loadComponent: () =>
          import('./pages/auth/bj-welcome/bj-welcome.page').then(
            (m) => m.BjWelcomePage,
          ),
        data: { title: 'Chào mừng', isAuthPage: true, hideHeader: true, hideFooter: true, showNotification: false },
      },

      // ── Tab pages (header + footer) ───────────────────────────────────────
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/home/bj-home.page').then((m) => m.BjHomePage),
        data: {
          tab: 'home',
          title: '',
          showBack: false,
          hideUser: false,
          hideHeader: false,
          hideFooter: false,
          showNotification: true,
          showSearch: true,
        },
      },
      {
        path: 'explore',
        loadComponent: () =>
          import('./pages/explore/bj-explore.page').then(
            (m) => m.BjExplorePage,
          ),
        data: {
          tab: 'explore',
          title: '',
          showBack: false,
          hideUser: false,
          hideHeader: true,
          hideFooter: false,
          isMapPage: true,
          showNotification: true,
          showSearch: false,
        },
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./pages/bookings/bj-bookings.page').then(
            (m) => m.BjBookingsPage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          tab: 'bookings',
          title: 'Lịch đặt xe',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: false,
          showNotification: true,
        },
      },
      {
        path: 'qr',
        loadComponent: () =>
          import('./pages/qr/bj-qr.page').then(
            (m) => m.BjQrPage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          tab: 'qr',
          title: 'QR Code',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: false,
          showNotification: false,
          hideLogo: true,
        },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/bj-settings.page').then(
            (m) => m.BjSettingsPage,
          ),
        data: {
          tab: 'settings',
          title: 'Cài đặt',
          showBack: false,
          hideUser: true,
          hideHeader: false,
          hideFooter: false,
          showNotification: true,
          hideLogo: true,
        },
      },

      // ── Sub-pages (có nút back, ẩn user, ẩn footer) ──────────────────────
      {
        path: 'station/:id',
        loadComponent: () =>
          import('./pages/station-detail/bj-station-detail.page').then(
            (m) => m.BjStationDetailPage,
          ),
        data: {
          title: 'Chi tiết trạm',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
          showNotification: false,
        },
      },
      {
        path: 'booking/new',
        loadComponent: () =>
          import('./pages/booking/bj-booking.page').then(
            (m) => m.BjBookingPage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          title: 'Đặt lịch',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
          showNotification: false,
        },
      },
      {
        path: 'booking/confirm',
        loadComponent: () =>
          import('./pages/booking/bj-booking-confirm.page').then(
            (m) => m.BjBookingConfirmPage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          title: 'Xác nhận đặt lịch',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
          showNotification: false,
        },
      },
      {
        path: 'booking/:id',
        loadComponent: () =>
          import('./pages/booking/bj-booking-detail.page').then(
            (m) => m.BjBookingDetailPage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          title: 'Chi tiết đặt lịch',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
          showNotification: false,
        },
      },
      // {
      //   path: 'wallet',
      //   loadComponent: () =>
      //     import('./pages/wallet/bj-wallet.page').then(
      //       (m) => m.BjWalletPage,
      //     ),
      //   canActivate: [bjAuthGuard],
      //   data: {
      //     title: 'Ví của tôi',
      //     showBack: true,
      //     hideUser: true,
      //     hideHeader: false,
      //     hideFooter: false,
      //     showNotification: false,
      //   },
      // },
      {
        path: 'vehicles',
        loadComponent: () =>
          import('./pages/vehicles/bj-vehicles.page').then(
            (m) => m.BjVehiclesPage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          title: 'Xe của tôi',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
          showNotification: false,
        },
      },
      {
        path: 'vehicles/add',
        loadComponent: () =>
          import('./pages/vehicles/bj-add-vehicle.page').then(
            (m) => m.BjAddVehiclePage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          title: 'Thêm xe',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
          showNotification: false,
        },
      },
      {
        path: 'vehicles/edit/:id',
        loadComponent: () =>
          import('./pages/vehicles/bj-add-vehicle.page').then(
            (m) => m.BjAddVehiclePage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          title: 'Chỉnh sửa xe',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
          showNotification: false,
        },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/bj-notifications.page').then(
            (m) => m.BjNotificationsPage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          title: 'Thông báo',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
          showNotification: false,
        },
      },
      {
        path: 'notification-settings',
        loadComponent: () =>
          import('./pages/notifications/bj-notification-settings.page').then(
            (m) => m.BjNotificationSettingsPage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          title: 'Cấu hình thông báo',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
          showNotification: false,
        },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/bj-profile.page').then(
            (m) => m.BjProfilePage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          title: 'Hồ sơ',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
          showNotification: false,
        },
      },
      // {
      //   path: 'member',
      //   loadComponent: () =>
      //     import('./pages/member/bj-member.page').then(
      //       (m) => m.BjMemberPage,
      //     ),
      //   canActivate: [bjAuthGuard],
      //   data: {
      //     title: 'Thành viên',
      //     showBack: true,
      //     hideUser: true,
      //     hideHeader: false,
      //     hideFooter: true,
      //     showNotification: false,
      //   },
      // },
      // {
      //   path: 'voucher',
      //   loadComponent: () =>
      //     import('./pages/Voucher/bj-voucher.page').then(
      //       (m) => m.BjVoucherPage,
      //     ),
      //   canActivate: [bjAuthGuard],
      //   data: {
      //     showBack: true,
      //   },
      // },
      {
        path: 'faq',
        loadComponent: () =>
          import('./pages/FAQ/bj-faq.page').then(
            (m) => m.BjFaqPage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          title: 'Ho tro & FAQ',
          showBack: true,
          hideUser: true,
          hideFooter: true,
        },
      },
      {
        path: 'support-chat',
        loadComponent: () =>
          import('./pages/support-chat/bj-support-chat.page').then(
            (m) => m.BjSupportChatPage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          title: 'Ho tro BroJet',
          showBack: true,
          hideUser: true,
          hideFooter: true,
        },
      },
      {
        path: 'posts',
        loadComponent: () =>
          import('./pages/posts/bj-posts.page').then(
            (m) => m.BjPostsPage,
          ),
        data: {
          title: 'Bài viết & Tin tức',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
        },
      },
      {
        path: 'posts/:slug',
        loadComponent: () =>
          import('./pages/posts/bj-post-detail.page').then(
            (m) => m.BjPostDetailPage,
          ),
        data: {
          title: 'Chi tiết bài viết',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
          showNotification: false,
        },
      },
      {
        path: 'policy',
        loadComponent: () =>
          import('./pages/policy/bj-policy.page').then(
            (m) => m.BjPolicyPage,
          ),
        canActivate: [bjAuthGuard],
        data: {
          title: 'Điều khoản & Chính sách',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
        },
      },
      {
        path: 'terms',
        loadComponent: () =>
          import('./pages/policy/bj-terms.page').then(
            (m) => m.BjTermsPage,
          ),
        data: {
          title: 'Điều khoản dịch vụ',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
        },
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./pages/policy/bj-privacy.page').then(
            (m) => m.BjPrivacyPage,
          ),
        data: {
          title: 'Chính sách bảo mật',
          showBack: true,
          hideUser: true,
          hideHeader: false,
          hideFooter: true,
        },
      }
      // {
      //   path: 'wallet-customer',
      //   loadComponent: () =>
      //     import('./pages/wallet-customer/wallet-customer').then(
      //       (m) => m.WalletCustomerPage,
      //     ),
      // },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BroJetRoutingModule { }
