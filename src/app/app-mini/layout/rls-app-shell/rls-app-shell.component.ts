import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

interface RlsNavItem {
  label: string;
  path: string;
  iconClass: string;
  exact: boolean;
  prominent?: boolean;
  activeDisabled?: boolean;
}

@Component({
  selector: 'rls-app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './rls-app-shell.component.html',
  styleUrls: ['./rls-app-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsAppShellComponent implements OnInit, OnDestroy {
  readonly navItems: RlsNavItem[] = [
    {
      label: 'Map',
      path: '/app-mini/home-map',
      iconClass: 'fa-solid fa-map',
      exact: true,
    },
    {
      label: 'Feed',
      path: '/app-mini/feed',
      iconClass: 'fa-regular fa-compass',
      exact: true,
    },
    {
      label: 'Đăng',
      path: '/app-mini/feed',
      iconClass: 'fa-solid fa-plus',
      exact: true,
      prominent: true,
      activeDisabled: true,
    },
    {
      label: 'Bạn bè',
      path: '/app-mini/friends',
      iconClass: 'fa-regular fa-message',
      exact: true,
    },
    {
      label: 'Tôi',
      path: '/app-mini/profile',
      iconClass: 'fa-regular fa-user',
      exact: true,
    },
  ];

  hideNav = false;
  isMapPage = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.syncRouteState();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.syncRouteState();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private syncRouteState(): void {
    let child: ActivatedRoute | null = this.route.firstChild;
    while (child?.firstChild) {
      child = child.firstChild;
    }

    const data = child?.snapshot.data ?? {};
    const authRoute =
      this.router.url.startsWith('/app-mini/login') ||
      this.router.url.startsWith('/app-mini/register');
    this.hideNav = data['hideNav'] === true || authRoute;
    this.isMapPage = data['isMapPage'] === true;
    this.cdr.markForCheck();
  }
}
