import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription, filter } from 'rxjs';

interface GmTabItem {
  label: string;
  route: string;
  tab: string;
  icon: string;
  center?: boolean;
}

@Component({
  selector: 'app-gm-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './gm-footer.component.html',
  styleUrls: ['./gm-footer.component.css'],
})
export class GmFooterComponent implements OnInit, OnDestroy {
  activeTab = 'home';
  tabs: GmTabItem[] = [
    { label: 'Home', route: '/gap-move/home', tab: 'home', icon: 'home-outline' },
    { label: 'Đơn', route: '/gap-move/bookings', tab: 'bookings', icon: 'receipt-outline' },
    { label: 'QR', route: '/gap-move/qr', tab: 'qr', icon: 'qr-code-outline', center: true },
    { label: 'Ví', route: '/gap-move/wallet', tab: 'wallet', icon: 'wallet-outline' },
    { label: 'Cài đặt', route: '/gap-move/settings', tab: 'settings', icon: 'settings-outline' },
  ];

  private routerSub?: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateActive(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => this.updateActive(event.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  navigate(route: string): void {
    this.router.navigateByUrl(route);
  }

  private updateActive(url: string): void {
    const matched = this.tabs.find((tab) => url.includes(tab.tab));
    this.activeTab = matched?.tab ?? 'home';
  }
}
