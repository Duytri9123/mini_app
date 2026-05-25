import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { BjHeaderComponent } from '../bj-header/bj-header.component';
import { BjFooterComponent } from '../bj-footer/bj-footer.component';


import { BjInitService } from '../../core/services/bj-init.service';


/**
 * BJ Layout – wrapper cho tất cả trang BRO JET có header + footer
 */
@Component({
  selector: 'app-bj-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, BjHeaderComponent, BjFooterComponent],
  templateUrl: './bj-layout.component.html',
})
export class BjLayoutComponent implements OnInit, OnDestroy {
  showHeader       = true;
  showFooter       = true;
  pageTitle        = '';
  showBack         = false;
  isMapPage        = false;
  hideUser         = false;
  showNotification = false;
  hideLogo         = false;

  private routerSub?: Subscription;

  constructor(
    private router: Router,
    private initService: BjInitService
  ) { }

  ngOnInit(): void {
    this.initService.init();
    this.updateChrome();

    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.updateChrome());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  /**
   * Đọc toàn bộ cấu hình header/footer từ route.data[]
   * Mọi thay đổi chỉ cần sửa trong bro-jet-routing.module.ts
   */
  private updateChrome(): void {
    const snapshot = this.router.routerState.snapshot.root;
    let route = snapshot;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const data = route.data ?? {};

    this.showHeader       = !(data['hideHeader'] ?? false);
    this.showFooter       = !(data['hideFooter'] ?? false);
    this.showBack         = data['showBack']         ?? false;
    this.pageTitle        = data['title']             ?? '';
    this.isMapPage        = data['isMapPage']         ?? false;
    this.hideUser         = data['hideUser']          ?? false;
    this.showNotification = data['showNotification']  ?? false;
    this.hideLogo         = data['hideLogo']          ?? false;
  }
}
