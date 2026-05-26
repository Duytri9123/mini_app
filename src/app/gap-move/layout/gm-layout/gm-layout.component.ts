import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { GmFooterComponent } from '../gm-footer/gm-footer.component';
import { GmHeaderComponent } from '../gm-header/gm-header.component';
import { GmToastComponent } from '../../shared/components/gm-toast/gm-toast.component';
import { GmInitService } from '../../core/services/gm-init.service';

@Component({
  selector: 'app-gm-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, GmHeaderComponent, GmFooterComponent, GmToastComponent],
  templateUrl: './gm-layout.component.html',
})
export class GmLayoutComponent implements OnInit, OnDestroy {
  showHeader = true;
  showFooter = true;
  pageTitle = '';
  showBack = false;
  isMapPage = false;
  hideUser = false;
  showNotification = false;
  hideLogo = false;
  isDesktop = false;
  useHomeHeader = false;

  private routerSub?: Subscription;
  private resizeHandler = () => this.updateViewport();

  constructor(
    private router: Router,
    private initService: GmInitService,
  ) {}

  ngOnInit(): void {
    this.initService.init();
    this.updateViewport();
    window.addEventListener('resize', this.resizeHandler, { passive: true });
    this.updateChrome();
    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.updateChrome());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    window.removeEventListener('resize', this.resizeHandler);
  }

  get shouldShowFooter(): boolean {
    return this.showFooter && !this.isDesktop;
  }

  get contentPaddingBottom(): string {
    return this.shouldShowFooter ? 'calc(72px + env(safe-area-inset-bottom, 0px))' : '0';
  }

  private updateChrome(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }

    const data = route.data ?? {};
    this.showHeader = !(data['hideHeader'] ?? false);
    this.showFooter = !(data['hideFooter'] ?? false);
    this.showBack = data['showBack'] ?? false;
    this.pageTitle = data['title'] ?? '';
    this.isMapPage = data['isMapPage'] ?? false;
    this.hideUser = data['hideUser'] ?? false;
    this.showNotification = data['showNotification'] ?? false;
    this.hideLogo = data['hideLogo'] ?? false;
    this.useHomeHeader = data['useHomeHeader'] ?? false;
  }

  private updateViewport(): void {
    this.isDesktop = window.matchMedia('(min-width: 1024px)').matches;
  }
}
