import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { gmAuthGuard } from './core/guards/gm-auth.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/gm-layout/gm-layout.component').then(
        (m) => m.GmLayoutComponent,
      ),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/auth/gm-login/gm-login.page').then(
            (m) => m.GmLoginPage,
          ),
        data: { title: 'Dang nhap', isAuthPage: true, hideHeader: true, hideFooter: true },
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/auth/gm-register/gm-register.page').then(
            (m) => m.GmRegisterPage,
          ),
        data: { title: 'Dang ky', isAuthPage: true, hideHeader: true, hideFooter: true },
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/home/gm-home.page').then((m) => m.GmHomePage),
        data: { tab: 'home', title: '', showNotification: true, showSearch: true, useHomeHeader: true },
      },
      {
        path: 'explore',
        loadComponent: () =>
          import('./pages/explore/gm-explore.page').then((m) => m.GmExplorePage),
        data: { tab: 'explore', title: '', hideHeader: true, isMapPage: true },
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./pages/bookings/gm-bookings.page').then((m) => m.GmBookingsPage),
        canActivate: [gmAuthGuard],
        data: { tab: 'bookings', title: 'Chuyến đi', showBack: true, hideUser: true },
      },
      {
        path: 'booking/new',
        loadComponent: () =>
          import('./pages/booking/gm-booking.page').then((m) => m.GmBookingPage),
        canActivate: [gmAuthGuard],
        data: { title: 'Dat xe / giao hang', hideHeader: true, hideFooter: true },
      },
      {
        path: 'truck',
        loadComponent: () =>
          import('./pages/booking/gm-booking.page').then((m) => m.GmBookingPage),
        canActivate: [gmAuthGuard],
        data: { title: 'Xe tai / xe van', bookingType: 'truck', hideHeader: true, hideFooter: true },
      },
      {
        path: 'moving',
        loadComponent: () =>
          import('./pages/booking/gm-booking.page').then((m) => m.GmBookingPage),
        canActivate: [gmAuthGuard],
        data: { title: 'Chuyen nha mini', bookingType: 'moving', hideHeader: true, hideFooter: true },
      },
      {
        path: 'carry',
        loadComponent: () =>
          import('./pages/booking/gm-booking.page').then((m) => m.GmBookingPage),
        canActivate: [gmAuthGuard],
        data: { title: 'Be ho hang', bookingType: 'porter', hideHeader: true, hideFooter: true },
      },
      {
        path: 'multi-stop',
        loadComponent: () =>
          import('./pages/multi-stop/gm-multi-stop.page').then((m) => m.GmMultiStopPage),
        canActivate: [gmAuthGuard],
        data: { title: 'Da don - Da diem', hideHeader: true, hideFooter: true },
      },
      {
        path: 'booking/confirm',
        loadComponent: () =>
          import('./pages/booking/gm-booking-confirm.page').then(
            (m) => m.GmBookingConfirmPage,
          ),
        canActivate: [gmAuthGuard],
        data: { title: 'Xac nhan don', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'booking/:id',
        loadComponent: () =>
          import('./pages/booking/gm-booking-detail.page').then(
            (m) => m.GmBookingDetailPage,
          ),
        canActivate: [gmAuthGuard],
        data: { title: 'Chi tiet don', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'deliveries',
        loadComponent: () =>
          import('./pages/deliveries/gm-deliveries.page').then(
            (m) => m.GmDeliveriesPage,
          ),
        canActivate: [gmAuthGuard],
        data: { title: 'Giao hang', showBack: true, hideUser: true },
      },
      {
        path: 'drivers',
        loadComponent: () =>
          import('./pages/drivers/gm-drivers.page').then((m) => m.GmDriversPage),
        data: { title: 'Tai xe dang hoat dong', showBack: true, hideUser: true },
      },
      {
        path: 'rewards',
        loadComponent: () =>
          import('./pages/rewards/gm-rewards.page').then((m) => m.GmRewardsPage),
        canActivate: [gmAuthGuard],
        data: { title: 'Uu dai', showBack: true, hideUser: true },
      },
      {
        path: 'vehicles',
        loadComponent: () =>
          import('./pages/vehicles/gm-vehicles.page').then((m) => m.GmVehiclesPage),
        canActivate: [gmAuthGuard],
        data: { title: 'Phuong tien', showBack: true, hideUser: true },
      },
      {
        path: 'vehicles/add',
        loadComponent: () =>
          import('./pages/vehicles/gm-add-vehicle.page').then(
            (m) => m.GmAddVehiclePage,
          ),
        canActivate: [gmAuthGuard],
        data: { title: 'Them phuong tien', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'wallet',
        loadComponent: () =>
          import('./pages/wallet/gm-wallet.page').then((m) => m.GmWalletPage),
        canActivate: [gmAuthGuard],
        data: { tab: 'wallet', title: 'Vi GapMove', showBack: true, hideUser: true },
      },
      {
        path: 'qr',
        loadComponent: () =>
          import('./pages/qr/gm-qr.page').then((m) => m.GmQrPage),
        canActivate: [gmAuthGuard],
        data: { tab: 'qr', title: 'Ma QR', showBack: true, hideUser: true, hideLogo: true },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/gm-notifications.page').then(
            (m) => m.GmNotificationsPage,
          ),
        canActivate: [gmAuthGuard],
        data: { title: 'Thong bao', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'notification-settings',
        loadComponent: () =>
          import('./pages/notifications/gm-notification-settings.page').then(
            (m) => m.GmNotificationSettingsPage,
          ),
        canActivate: [gmAuthGuard],
        data: { title: 'Cai dat thong bao', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/gm-profile.page').then((m) => m.GmProfilePage),
        canActivate: [gmAuthGuard],
        data: { title: 'Ho so', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/gm-settings.page').then((m) => m.GmSettingsPage),
        data: { tab: 'settings', title: 'Cai dat', hideUser: true, hideLogo: true },
      },
      {
        path: 'saved-addresses',
        loadComponent: () =>
          import('./pages/saved-addresses/gm-saved-addresses.page').then(
            (m) => m.GmSavedAddressesPage,
          ),
        canActivate: [gmAuthGuard],
        data: { title: 'Dia chi da luu', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'business',
        loadComponent: () =>
          import('./pages/business/gm-business.page').then((m) => m.GmBusinessPage),
        canActivate: [gmAuthGuard],
        data: { title: 'Doanh nghiep', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'services/:slug',
        loadComponent: () =>
          import('./pages/info/gm-info.page').then((m) => m.GmInfoPage),
        data: { title: 'Dich vu GapMove', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'customers/:slug',
        loadComponent: () =>
          import('./pages/info/gm-info.page').then((m) => m.GmInfoPage),
        data: { title: 'Khach hang GapMove', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'driver/:slug',
        loadComponent: () =>
          import('./pages/info/gm-info.page').then((m) => m.GmInfoPage),
        data: { title: 'Tai xe GapMove', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'careers/:slug',
        loadComponent: () =>
          import('./pages/info/gm-info.page').then((m) => m.GmInfoPage),
        data: { title: 'GapMove Careers', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'news',
        loadComponent: () =>
          import('./pages/info/gm-info.page').then((m) => m.GmInfoPage),
        data: { title: 'Tin tuc GapMove', showBack: true, hideUser: true, hideFooter: true, infoSlug: 'latest' },
      },
      {
        path: 'news/business',
        loadComponent: () =>
          import('./pages/info/gm-info.page').then((m) => m.GmInfoPage),
        data: { title: 'Blog kinh doanh', showBack: true, hideUser: true, hideFooter: true, infoSlug: 'business-blog' },
      },
      {
        path: 'news/:slug',
        loadComponent: () =>
          import('./pages/info/gm-info.page').then((m) => m.GmInfoPage),
        data: { title: 'Tin tuc GapMove', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'faq',
        loadComponent: () =>
          import('./pages/faq/gm-faq.page').then((m) => m.GmFaqPage),
        data: { title: 'Ho tro & FAQ', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'support-chat',
        loadComponent: () =>
          import('./pages/support-chat/gm-support-chat.page').then(
            (m) => m.GmSupportChatPage,
          ),
        canActivate: [gmAuthGuard],
        data: { title: 'Ho tro GapMove', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'policy',
        loadComponent: () =>
          import('./pages/policy/gm-policy.page').then((m) => m.GmPolicyPage),
        data: { title: 'Dieu khoan & chinh sach', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'terms',
        loadComponent: () =>
          import('./pages/policy/gm-terms.page').then((m) => m.GmTermsPage),
        data: { title: 'Dieu khoan dich vu', showBack: true, hideUser: true, hideFooter: true },
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./pages/policy/gm-privacy.page').then((m) => m.GmPrivacyPage),
        data: { title: 'Chinh sach bao mat', showBack: true, hideUser: true, hideFooter: true },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GapMoveRoutingModule {}
