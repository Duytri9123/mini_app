import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription, filter } from 'rxjs';
import { BJ_ICONS } from '../../shared/icons/bj-icons';
import { BJ_COLORS } from '../../shared/constants/bj-colors';

interface TabItem {
  label: string;
  route: string;
  tab: string;
  icon: SafeHtml;
  iconDesktop?: SafeHtml;
  center?: boolean;
}

const NOTCH_WIDTH = 100;
const NOTCH_DEPTH = 28;
const EDGE_RADIUS = 23;
const BAR_HEIGHT = 68;

@Component({
  selector: 'app-bj-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bj-footer.component.html',
  styleUrl: './bj-footer.component.css',
})
export class BjFooterComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('navBar', { static: true }) navBarRef!: ElementRef<HTMLDivElement>;

  activeTab = 'home';
  navWidth = 390;
  barHeight = BAR_HEIGHT;
  bgPath = '';
  shadowPath = '';

  tabs: TabItem[];
  readonly BJ_COLORS = BJ_COLORS;

  private routerSub?: Subscription;
  private ro?: ResizeObserver;

  constructor(private router: Router, private sanitizer: DomSanitizer) {
    const s = (svg: string): SafeHtml => sanitizer.bypassSecurityTrustHtml(svg);

    this.tabs = [
      {
        label: 'Trang chủ',
        route: '/bro-jet/home',
        tab: 'home',
        icon: s(BJ_ICONS.NAV_HOME),
      },
      {
        label: 'Đặt Lịch',
        route: '/bro-jet/bookings',
        tab: 'bookings',
        icon: s(BJ_ICONS.NAV_BOOKING),
      },
      {
        label: 'QR',
        route: '/bro-jet/qr',
        tab: 'qr',
        center: true,
        icon: s(BJ_ICONS.QR_CODE),
        iconDesktop: s(BJ_ICONS.QR_CODE),
      },
      {
        label: 'Khám phá',
        route: '/bro-jet/explore',
        tab: 'explore',
        icon: s(BJ_ICONS.NAV_EXPLORE),
      },
      // {
      //   label: 'Ví',
      //   route: '/bro-jet/wallet',
      //   tab: 'wallet',
      //   icon: s(BJ_ICONS.NAV_WALLET),
      // },
      {
        label: 'Cài Đặt',
        route: '/bro-jet/settings',
        tab: 'settings',
        icon: s(BJ_ICONS.NAV_SETTING),
      },
    ];
  }

  ngOnInit(): void {
    this.updateActiveTab(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => this.updateActiveTab(e.urlAfterRedirects));
  }

  ngAfterViewInit(): void {
    this.measureAndBuild();
    this.ro = new ResizeObserver(() => this.measureAndBuild());
    this.ro.observe(this.navBarRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.ro?.disconnect();
  }

  navigate(route: string): void {
    this.router.navigateByUrl(route);
  }

  private measureAndBuild(): void {
    const w = this.navBarRef.nativeElement.offsetWidth || 390;
    this.navWidth = w;
    this.bgPath = this.buildPath(w, 0);
    this.shadowPath = this.buildPath(w, -1);
  }

  private buildPath(w: number, yOffset: number): string {
    const cx = w / 2;
    const nl = cx - NOTCH_WIDTH / 2;
    const nr = cx + NOTCH_WIDTH / 2;
    const H = BAR_HEIGHT;
    const y = yOffset;

    return [
      `M 0 ${EDGE_RADIUS + y}`,
      `Q 0 ${y} ${EDGE_RADIUS} ${y}`,
      `L ${nl - 14} ${y}`,
      `Q ${nl + 6} ${y} ${nl + 16} ${10 + y}`,
      `Q ${cx - 26} ${NOTCH_DEPTH + y} ${cx} ${NOTCH_DEPTH + y}`,
      `Q ${cx + 26} ${NOTCH_DEPTH + y} ${nr - 16} ${10 + y}`,
      `Q ${nr - 6} ${y} ${nr + 14} ${y}`,
      `L ${w - EDGE_RADIUS} ${y}`,
      `Q ${w} ${y} ${w} ${EDGE_RADIUS + y}`,
      `L ${w} ${H}`,
      `L 0 ${H}`,
      `Z`,
    ].join(' ');
  }

  private updateActiveTab(url: string): void {
    if (url.includes('/profile') || url.includes('/settings')) {
      this.activeTab = 'profile';
      return;
    }
    const matched = this.tabs.find((t) => url.includes(t.tab));
    this.activeTab = matched ? matched.tab : 'home';
  }
}
