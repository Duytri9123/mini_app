import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { rlsAuthGuard } from './core/guards/rls-auth.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/rls-app-shell/rls-app-shell.component').then(
        (m) => m.RlsAppShellComponent,
      ),
    children: [
      {
        path: '',
        redirectTo: 'home-map',
        pathMatch: 'full',
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/auth/rls-login.page').then((m) => m.RlsLoginPage),
        data: { title: 'Dang nhap', hideNav: true },
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/auth/rls-login.page').then((m) => m.RlsLoginPage),
        data: { title: 'Dang ky', hideNav: true },
      },
      {
        path: 'home-map',
        loadComponent: () =>
          import('./pages/home-map/rls-home-map.page').then(
            (m) => m.RlsHomeMapPage,
          ),
        data: { title: 'Map', isMapPage: true },
      },
      {
        path: 'feed',
        loadComponent: () =>
          import('./pages/local-feed/rls-local-feed.page').then(
            (m) => m.RlsLocalFeedPage,
          ),
        data: { title: 'Feed' },
      },
      {
        path: 'location/:id',
        loadComponent: () =>
          import('./pages/location-detail/rls-location-detail.page').then(
            (m) => m.RlsLocationDetailPage,
          ),
        data: { title: 'Chi tiet dia diem' },
      },
      {
        path: 'stories',
        loadComponent: () =>
          import('./pages/story-viewer/rls-story-viewer.page').then(
            (m) => m.RlsStoryViewerPage,
          ),
        data: { title: 'Stories' },
      },
      {
        path: 'trending',
        loadComponent: () =>
          import('./pages/trending/rls-trending.page').then(
            (m) => m.RlsTrendingPage,
          ),
        data: { title: 'Trending' },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/rls-notifications.page').then(
            (m) => m.RlsNotificationsPage,
          ),
        canActivate: [rlsAuthGuard],
        data: { title: 'Thong bao' },
      },
      {
        path: 'friends',
        loadComponent: () =>
          import('./pages/friends/rls-friends.page').then(
            (m) => m.RlsFriendsPage,
          ),
        canActivate: [rlsAuthGuard],
        data: { title: 'Ban be' },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/rls-profile.page').then(
            (m) => m.RlsProfilePage,
          ),
        canActivate: [rlsAuthGuard],
        data: { title: 'Ho so', shellTheme: 'light' },
      },
      {
        path: '**',
        redirectTo: 'home-map',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppMiniRoutingModule {}
