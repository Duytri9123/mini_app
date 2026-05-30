import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
// import { AuthGuard } from './gogo/guards/auth.guard';
// import { SeekerGuard } from './gogo/guards/seeker.guard';
// import { HomeSeekerGuard } from './gogo/guards/home-seeker.guard';
// import { CompanyGuard } from './gogo/guards/company.guard';
// import { NoRoleGuard } from './gogo/guards/NoRoleGuard';
// import { EmployerSetupGuard } from './gogo/guards/employer-setup.guard';
// import { DashboardLayoutComponent } from './gogo/layout/dashboard-layout/dashboard-layout.component';
// import { AutoRedirectPage } from './gogo/pages/auto-redirect/auto-redirect.page';
// import { RoleGuard } from './gogo/guards/role.guard';
// import { FbSuccessComponent } from './gogo/auth/fb-success.component';
// import { FbErrorComponent } from './gogo/auth/fb-error.component';
// import { BetaRouteBlockGuard } from './gogo/guards/beta-route-block.guard';

const routes: Routes = [
  // ── GapMove delivery and ride booking ─────────────────────────────────────
  {
    path: 'gap-move',
    loadChildren: () =>
      import('./gap-move/gapmove.module').then((m) => m.GapMoveModule),
  },
  // ── BRO JET Auto Spa ──────────────────────────────────────────────────────
  {
    path: 'bro-jet',
    loadChildren: () =>
      import('./bro-jet/bro-jet.module').then((m) => m.BroJetModule),
  },
  // ── Realtime Local Social (app-mini) ───────────────────────────────────────
  {
    path: 'app-mini',
    loadChildren: () =>
      import('./app-mini/app-mini.module').then((m) => m.AppMiniModule),
  },
  {
    path: '',
    redirectTo: 'gap-move',
    pathMatch: 'full',
  },

  // ── Old routes (commented out) ────────────────────────────────────────────
  // {
  //   path: 'fb-success',
  //   component: FbSuccessComponent
  // },
  // {
  //   path: 'fb-error',
  //   component: FbErrorComponent
  // },
  // // 1. Auth Callback
  // {
  //   path: 'auth/callback',
  //   loadComponent: () =>
  //     import('./auth/auth-callback.component').then(
  //       (m) => m.AuthCallbackComponent,
  //     ),
  // },
  // // 2. Auth / No-Layout Pages
  // {
  //   path: '',
  //   canActivate: [RoleGuard],
  //   component: AutoRedirectPage,
  // },
  // {
  //   path: 'auto-redirect',
  //   loadChildren: () =>
  //     import('./pages/auto-redirect/auto-redirect.module').then(
  //       (m) => m.AutoRedirectPageModule,
  //     ),
  // },
  // {
  //   path: 'login',
  //   loadChildren: () =>
  //     import('./pages/login/login.module').then((m) => m.LoginPageModule),
  // },
  // {
  //   path: 'register',
  //   loadChildren: () =>
  //     import('./pages/register/register.module').then(
  //       (m) => m.RegisterPageModule,
  //     ),
  // },
  // {
  //   path: 'reset-password',
  //   loadChildren: () =>
  //     import('./pages/reset-password/reset-password.module').then(
  //       (m) => m.ResetPasswordPageModule,
  //     ),
  // },
  // {
  //   path: 'verify-email',
  //   loadChildren: () =>
  //     import('./pages/verify-email/verify-email.module').then(
  //       (m) => m.VerifyEmailPageModule,
  //     ),
  // },
  // {
  //   path: 'email/verify/:id/:hash',
  //   loadChildren: () =>
  //     import('./pages/verify-email/verify-email.module').then(
  //       (m) => m.VerifyEmailPageModule,
  //     ),
  // },
  // {
  //   path: 'choose-role',
  //   loadChildren: () =>
  //     import('./pages/choose-role/choose-role.module').then(
  //       (m) => m.ChooseRolePageModule,
  //     ),
  //   canActivate: [NoRoleGuard],
  // },
  // {
  //   path: 'chat/:id',
  //   loadComponent: () =>
  //     import('./pages/chat/chat-entry.component').then(
  //       (m) => m.ChatEntryComponent,
  //     ),
  //   canActivate: [AuthGuard],
  // },
  // {
  //   path: 'chat/standalone/:id',
  //   loadChildren: () =>
  //     import('./pages/chat/chat.module').then((m) => m.ChatPageModule),
  //   canActivate: [AuthGuard],
  // },
  // {
  //   path: 'forgot-password',
  //   loadChildren: () =>
  //     import('./pages/forgot-password/forgot-password.module').then(
  //       (m) => m.ForgotPasswordPageModule,
  //     ),
  // },
  // // 3. Dashboard Layout Group
  // {
  //   path: '',
  //   component: DashboardLayoutComponent,
  //   children: [
  //     { path: 'company-auth', loadChildren: () => import('./pages/company-auth/company-auth.module').then((m) => m.CompanyAuthPageModule), canActivate: [EmployerSetupGuard], data: { showHeader: true, title: 'Yêu cầu xác thực', showUserInfo: false, showBackButton: true, showChat: false, showNotifications: false } },
  //     { path: 'otp-verification', loadChildren: () => import('./pages/otp-verification/otp-verification.module').then((m) => m.OtpVerificationPageModule), data: { showHeader: true, title: 'Xác minh OTP', showUserInfo: false, showBackButton: true, showChat: false, showNotifications: false } },
  //     { path: 'home', loadChildren: () => import('./home/home.module').then((m) => m.HomePageModule), canActivate: [CompanyGuard], data: { showHeader: true, showUserInfo: true, showFooter: true, showChat: true, showNotifications: true } },
  //     { path: 'seeker-home', loadChildren: () => import('./pages/seeker/home/home.module').then((m) => m.HomePageModule), canActivate: [HomeSeekerGuard], data: { showHeader: true, showUserInfo: true, showFooter: true, showChat: true, showNotifications: true } },
  //     { path: 'jobquickly', loadChildren: () => import('./pages/seeker/jobquickly/jobquickly.module').then((m) => m.JobquicklyPageModule), canActivate: [HomeSeekerGuard], data: { showHeader: true, showUserInfo: true, showFooter: true, showChat: true, showNotifications: true } },
  //     { path: 'notification', loadChildren: () => import('./pages/notification/notification.module').then((m) => m.NotificationPageModule), canActivate: [AuthGuard], data: { showHeader: true, title: 'Thông báo', showUserInfo: false, showBackButton: true, showNotifications: false, showChat: true, showFooter: false, showPostNews: false } },
  //     { path: 'chat-list', loadChildren: () => import('./pages/chat-list/chat-list.module').then((m) => m.ChatListPageModule), canActivate: [AuthGuard], data: { showHeader: true, title: 'Tin nhắn', showUserInfo: false, showBackButton: true, showFooter: false, showChat: true, showNotifications: true } },
  //     { path: 'notification-settings', loadComponent: () => import('./pages/notification-settings/notification-settings.page').then((m) => m.NotificationSettingsPage), canActivate: [AuthGuard], data: { showHeader: true, title: 'Cài đặt thông báo', showUserInfo: false, showBackButton: true, showNotifications: false, showChat: false, showPostNews: false, showFooter: false } },
  //     { path: 'my-reports', loadComponent: () => import('./pages/my-reports/my-reports.page').then((m) => m.MyReportsPage), canActivate: [AuthGuard], data: { showHeader: true, title: 'Danh sách báo cáo', showUserInfo: false, showBackButton: true, showChat: true, showNotifications: true } },
  //     { path: 'verify-email-change', loadComponent: () => import('./pages/verify-email-change/verify-email-change.page').then((m) => m.VerifyEmailChangePage), canActivate: [AuthGuard], data: { showHeader: true, title: 'Xác thực Email mới', showUserInfo: false, showBackButton: true, showChat: true, showNotifications: true } },
  //     { path: 'info-job-long-term', loadChildren: () => import('./pages/information/information.module').then((m) => m.InformationPageModule), canActivate: [AuthGuard], data: { showHeader: true, title: 'Thông tin cá nhân', showUserInfo: false, showBackButton: true, showChat: false, showNotifications: false } },
  //     { path: 'candidate-profile/:id', loadChildren: () => import('./pages/candidate-profile/candidate-profile.module').then((m) => m.CandidateProfilePageModule), canActivate: [AuthGuard], data: { showHeader: true, title: 'Hồ sơ ứng viên', showUserInfo: false, showBackButton: true, showChat: true, showNotifications: true } },
  //     { path: 'postnews', loadChildren: () => import('./pages/postnews/postnews.module').then((m) => m.PostnewsPageModule), canActivate: [EmployerSetupGuard], data: { showHeader: true, title: 'Đăng Bài', showUserInfo: false, showBackButton: true } },
  //     { path: 'upgrade', loadChildren: () => import('./pages/upgrade/upgrade.module').then((m) => m.UpgradePageModule), canActivate: [AuthGuard, BetaRouteBlockGuard], data: { showHeader: true, title: 'Chọn gói đăng tin', showUserInfo: false, showBackButton: true, showChat: true, showNotifications: true } },
  //     { path: 'vietqr', loadChildren: () => import('./pages/vietqr/vietqr.module').then((m) => m.VietqrPageModule), canActivate: [AuthGuard, BetaRouteBlockGuard], data: { showHeader: true, title: 'Thanh Toán', showUserInfo: false, showBackButton: true, showChat: true, showNotifications: true } },
  //     { path: 'job-posts', loadChildren: () => import('./pages/job-posts/job-posts.module').then((m) => m.JobPostsPageModule), canActivate: [AuthGuard], data: { showHeader: true, title: 'Việc dài hạn', showUserInfo: false, showBackButton: true, showFooter: false } },
  //     { path: 'campaign', loadChildren: () => import('./pages/campaign/campaign.module').then((m) => m.CampaignPageModule), canActivate: [AuthGuard], data: { showHeader: true, showUserInfo: true, showNotifications: true, showChat: true, showPostNews: false } },
  //     { path: 'cv-management', loadChildren: () => import('./pages/cv-management/cv-management.module').then((m) => m.CvManagementPageModule), canActivate: [CompanyGuard], data: { showHeader: true, title: 'Quản lý ứng viên', showUserInfo: false, showMenuButton: true, showNotifications: true, showChat: true, showPostNews: false, showFooter: true } },
  //     { path: 'cv-management/candidate/:id', loadChildren: () => import('./pages/cv-management/candidate-cv-detail/candidate-cv-detail.module').then((m) => m.CandidateCvDetailPageModule), canActivate: [CompanyGuard], data: { showHeader: true, title: 'Chi tiết hồ sơ', showUserInfo: false, showBackButton: true, showNotifications: true, showChat: true, showFooter: false } },
  //     { path: 'quick-job-candidates', loadChildren: () => import('./pages/quick-job-candidates/quick-job-candidates.module').then((m) => m.QuickJobCandidatesPageModule), canActivate: [CompanyGuard], data: { showHeader: true, title: 'Quản lý CV việc nhanh', showUserInfo: false, showBackButton: true, showNotifications: true, showChat: true } },
  //     { path: 'detail-cv-campaign/:applicantId', loadChildren: () => import('./pages/detail-cv-campaign/detail-cv-campaign.module').then((m) => m.DetailCvCampaignPageModule), canActivate: [AuthGuard], data: { showHeader: true, title: 'Chi tiết hồ sơ', showUserInfo: false, showBackButton: true, showNotifications: true, showChat: true, showfooter: false } },
  //     { path: 'detail-cv-jobquick/:id', loadChildren: () => import('./pages/detail-cv-jobquick/detail-cv-jobquick.module').then((m) => m.DetailCvJobquickPageModule), canActivate: [AuthGuard], data: { showHeader: true, title: 'Chi tiết hồ sơ ứng viên', showUserInfo: false, showBackButton: true, showNotifications: true, showChat: true, showFooter: false } },
  //     { path: 'candidate-cv-detail/:id', loadComponent: () => import('./pages/company/candidate-cv-detail/candidate-cv-detail.page').then((m) => m.CandidateCvDetailPage), canActivate: [AuthGuard], data: { showHeader: true, title: 'Chi tiết hồ sơ ứng viên', showUserInfo: false, showBackButton: true } },
  //     { path: 'branchs/:branchId/jobs', loadChildren: () => import('./pages/branch-jobs/branch-jobs.module').then((m) => m.BranchJobsPageModule), canActivate: [AuthGuard], data: { showHeader: true, title: 'Chi nhánh', showUserInfo: false, showBackButton: true } },
  //     { path: 'job-applicants-list/:id', loadComponent: () => import('./pages/job-applicants-list/job-applicants-list.page').then((m) => m.JobApplicantsListPage), canActivate: [CompanyGuard], data: { showHeader: true, title: 'Danh sách ứng viên', showUserInfo: false, showBackButton: true } },
  //     { path: 'employee-branch-list', loadComponent: () => import('./components/employee-branch-list/employee-branch-list.component').then((m) => m.EmployeeBranchListComponent), canActivate: [AuthGuard], data: { showHeader: true, title: 'Danh sách chi nhánh', showUserInfo: false, showBackButton: true, preserveLayoutFromParent: true } },
  //     { path: 'campaign-list', loadComponent: () => import('./components/campaign-list/campaign-list.component').then((m) => m.CampaignListComponent), canActivate: [AuthGuard], data: { showHeader: true, title: 'Danh sách tuyển dụng', showUserInfo: false, showBackButton: true, preserveLayoutFromParent: true } },
  //     { path: 'job-applicants-list1/:id', loadComponent: () => import('./components/job-applicants-list/job-applicants-list.component').then((m) => m.JobApplicantsListComponent), canActivate: [AuthGuard], data: { showHeader: true, title: 'Danh sách ứng viên', showUserInfo: false, showBackButton: true, preserveLayoutFromParent: true } },
  //     { path: 'my-jobs', loadChildren: () => import('./pages/seeker/my-jobs/my-jobs.module').then((m) => m.MyJobsPageModule), canActivate: [SeekerGuard], data: { showHeader: true, title: 'Việc Dài Hạn', showUserInfo: false, showMenuButton: true, showFooter: true, showChat: true, showNotifications: true } },
  //     { path: 'companyshow/:slug', loadComponent: () => import('./pages/seeker/company/company.page').then((m) => m.CompanyPage), data: { showHeader: true, title: 'Thông tin công ty', showUserInfo: false, showBackButton: true, showChat: true, showNotifications: true } },
  //     { path: 'job-individuals', loadChildren: () => import('./pages/seeker/job-individuals/job-individuals.module').then((m) => m.JobIndividualsPageModule), data: { showHeader: true, title: 'Việc nhanh', showUserInfo: false, showBackButton: true, showFooter: false } },
  //     { path: 'cv-detail/:id', loadChildren: () => import('./pages/cv-detail/cv-detail.module').then((m) => m.CvDetailPageModule), canActivate: [AuthGuard], data: { showHeader: true, title: 'Chi tiết CV', showUserInfo: false, showBackButton: true, showChat: true, showNotifications: true } },
  //     { path: 'settings', loadChildren: () => import('./pages/settings/settings.module').then((m) => m.SettingsPageModule), canActivate: [AuthGuard], data: { showHeader: true, title: 'Cài đặt', showUserInfo: false, showBackButton: false, showNotifications: true, showChat: true } },
  //     { path: 'company', loadChildren: () => import('./pages/company/company.module').then((m) => m.CompanyPageModule), canActivate: [CompanyGuard], data: { showHeader: true, title: 'Thông tin cửa hàng', showUserInfo: false, showBackButton: true, showFooter: false, showChat: true, showNotifications: true } },
  //     { path: 'profile', loadChildren: () => import('./pages/profile/profile.module').then((m) => m.ProfilePageModule), canActivate: [AuthGuard], data: { showHeader: true, title: 'Hồ sơ cá nhân', showUserInfo: false, showBackButton: true, showFooter: false, showNotifications: true, showChat: true } },
  //     { path: 'data', loadChildren: () => import('./pages/data/data.module').then((m) => m.DataPageModule), canActivate: [AuthGuard], data: { showHeader: true, title: 'Chính sách dữ liệu cá nhân', showUserInfo: false, showBackButton: true, showNotifications: false, showChat: false, showPostNews: false, showFooter: false } },
  //     { path: 'guide', loadChildren: () => import('./pages/guide/guide.module').then((m) => m.GuidePageModule), data: { showHeader: true, title: 'Hướng dẫn sử dụng', showUserInfo: false, showBackButton: true, showNotifications: false, showChat: false, showPostNews: false, showFooter: false } },
  //     { path: 'privacy', loadChildren: () => import('./pages/privacy/privacy.module').then((m) => m.PrivacyPageModule), data: { showHeader: true, title: 'Chính sách dữ liệu cá nhân', showUserInfo: false, showBackButton: true, showNotifications: false, showChat: false, showPostNews: false, showFooter: false } },
  //     { path: 'terms', loadChildren: () => import('./pages/terms/terms.module').then((m) => m.TermsPageModule), data: { showHeader: true, title: 'Điều khoản sử dụng', showUserInfo: false, showBackButton: true, showNotifications: false, showChat: false, showPostNews: false, showFooter: false } },
  //     { path: 'cv-list', loadChildren: () => import('./pages/cv-list/cv-list.module').then((m) => m.CvListPageModule), canActivate: [SeekerGuard], data: { showHeader: true, title: 'Quản lý CV của tôi', showUserInfo: false, showBackButton: true, showNotifications: false, showChat: false, showPostNews: false, showNoMenuButton: true, showFooter: false } },
  //     { path: 'change-password', loadComponent: () => import('./pages/change-password/change-password.page').then((m) => m.ChangePasswordPage), canActivate: [AuthGuard], data: { showHeader: true, title: 'Đổi mật khẩu', showUserInfo: false, showBackButton: true, showNotifications: true, showChat: true, showPostNews: false, showNoMenuButton: true, showFooter: false } },
  //     { path: 'articles', loadChildren: () => import('./pages/articles/articles.module').then((m) => m.ArticlesPageModule), data: { showHeader: true, title: 'Bài viết', showUserInfo: false, showBackButton: true, showNotifications: false, showChat: false, showFooter: false } },
  //     { path: 'article-detail/:slug', loadChildren: () => import('./pages/article-detail/article-detail.module').then((m) => m.ArticleDetailPageModule), data: { showHeader: true, title: 'Bài viết', showUserInfo: false, showBackButton: true, showNotifications: false, showChat: false, showFooter: false } },
  //   ],
  // },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
