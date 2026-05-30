import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/**
 * REALTIME LOCAL SOCIAL (app-mini) – routing
 * ─────────────────────────────────────────────────────────────────────────────
 * Cấu hình routing tối thiểu (task 10.1) để lazy module `/app-mini` tải được.
 * Layout shell (RlsLayoutComponent), các page feed/story/trending/notifications
 * và guard route protected sẽ được bổ sung ở các task sau (15.x, 16.x).
 * ─────────────────────────────────────────────────────────────────────────────
 */
const routes: Routes = [
  {
    path: '',
    redirectTo: 'home-map',
    pathMatch: 'full',
  },
  {
    path: 'home-map',
    loadComponent: () =>
      import('./pages/home-map/rls-home-map.page').then((m) => m.RlsHomeMapPage),
    data: {
      title: '',
      isMapPage: true,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppMiniRoutingModule {}
