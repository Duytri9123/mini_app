import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { Subscription, filter } from 'rxjs';
import { BjAuthService } from '../../core/services/bj-auth.service';
import { BjLocationService } from '../../core/services/bj-location.service';
import { BjNotificationService, BjNotification } from '../../core/services/bj-notification.service';
import { BjUser } from '../../core/interfaces/user.interface';
import { BjExploreSearchComponent } from '../../shared/components/bj-explore-search/bj-explore-search.component';
import { BjNotificationBellComponent } from '../../shared/components/bj-notification-bell/bj-notification-bell.component';
import { BJ_ICONS } from '../../shared/icons/bj-icons';
import { SafeSvgPipe } from '../../shared/pipes/safe-svg.pipe';

@Component({
  selector: 'app-bj-header',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule, BjExploreSearchComponent, BjNotificationBellComponent, SafeSvgPipe],
  templateUrl: './bj-header.component.html',
  styleUrls: ['./bj-header.component.scss'],
})
export class BjHeaderComponent implements OnInit, OnDestroy {
  @Input() title: string = '';
  @Input() showBack: boolean = false;
  @Input() hideUser: boolean = false;
  @Input() showNotification: boolean = false;
  @Input() showSearch: boolean = false;
  @Input() hideLogo: boolean = false;
  @Output() search = new EventEmitter<string>();

  readonly icons = BJ_ICONS;

  @ViewChild(BjNotificationBellComponent) bellRef?: BjNotificationBellComponent;

  user: BjUser | null = null;
  currentAddress: string = 'Đang lấy vị trí...';
  isAuthPage = false;
  isLoggingOut = false;
  showUserMenu = false;
  showNotifMenu = false;
  searchQuery = '';

  private routerSub?: Subscription;
  private userSub?: Subscription;
  private locationSub?: Subscription;

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private authService: BjAuthService,
    private locationService: BjLocationService,
    private notificationService: BjNotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user) => {
      this.user = user;
      this.cdr.markForCheck();
    });

    this.locationSub = this.locationService.getAddress().subscribe((addr) => {
      this.currentAddress = addr;
      this.cdr.markForCheck();
    });



    this.updateRouteState();

    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.updateRouteState());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.locationSub?.unsubscribe();
  }

  private updateRouteState(): void {
    const currentRoute = this.router.routerState.snapshot.root;
    let route = currentRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }
    if (route.data?.['title']) {
      this.title = route.data['title'];
    }
    this.isAuthPage = route.data?.['isAuthPage'] ?? false;
    this.showSearch = route.data?.['showSearch'] ?? false;
    this.hideLogo = route.data?.['hideLogo'] ?? false;
  }

  onLocationTap(): void {
    this.locationService.refresh();
  }

  get userFirstName(): string {
    if (!this.user?.fullName) return '';
    const parts = this.user.fullName.split(' ');
    return parts[parts.length - 1] || this.user.fullName;
  }

  goBack(): void {
    window.history.back();
  }

  goToProfile(): void {
    this.navCtrl.navigateForward(['/bro-jet/profile']);
  }

  goToLogin(): void {
    this.navCtrl.navigateForward(['/bro-jet/login']);
  }

  goToRegister(): void {
    this.navCtrl.navigateForward(['/bro-jet/register']);
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
    // Đóng notification bell nếu đang mở
    if (this.showUserMenu && this.bellRef) {
      this.bellRef.isOpen = false;
    }
  }

  menuNavigate(path: string): void {
    this.showUserMenu = false;
    this.navCtrl.navigateForward([path]);
  }

  onNotifClick(n: BjNotification): void {
    // Handle notification click — navigate based on type if needed
    // Currently just closes the dropdown; navigation handled by bell component
  }

  logout(): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    this.authService.logout().subscribe({
      next: () => {
        this.isLoggingOut = false;
        this.navCtrl.navigateRoot(['/bro-jet/login']);
      },
      error: () => {
        this.isLoggingOut = false;
        this.navCtrl.navigateRoot(['/bro-jet/login']);
      },
    });
  }


}
