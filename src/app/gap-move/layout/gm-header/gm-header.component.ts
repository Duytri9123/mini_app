import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { GmAuthService } from '../../core/services/gm-auth.service';
import { GmLocationService } from '../../core/services/gm-location.service';
import { GmNotificationBellComponent } from '../../shared/components/gm-notification-bell/gm-notification-bell.component';
import { GmUser } from '../../core/interfaces/user.interface';

interface GmHeaderMenuItem {
  label: string;
  route: string;
  description?: string;
  badge?: string;
}

interface GmHeaderMenu {
  label: string;
  items: GmHeaderMenuItem[];
}

@Component({
  selector: 'app-gm-header',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, GmNotificationBellComponent],
  templateUrl: './gm-header.component.html',
  styleUrls: ['./gm-header.component.scss'],
})
export class GmHeaderComponent implements OnInit, OnDestroy {
  @Input() title = '';
  @Input() showBack = false;
  @Input() hideUser = false;
  @Input() showNotification = false;
  @Input() hideLogo = false;
  @Input() useHomeHeader = false;

  user: GmUser | null = null;
  currentAddress = 'Dang lay vi tri...';
  appNavItems = [
    { label: 'Đặt đơn', route: '/gap-move/booking/new' },
    { label: 'Đơn hàng', route: '/gap-move/bookings' },
    { label: 'Thanh toán', route: '/gap-move/wallet' },
    { label: 'Tài xế', route: '/gap-move/drivers' },
    { label: 'Ưu đãi', route: '/gap-move/rewards' },
    { label: 'Bê hộ hàng', route: '/gap-move/carry' },
  ];
  desktopMenus: GmHeaderMenu[] = [
    {
      label: 'Dịch vụ',
      items: [
        { label: 'Giao hàng nhanh', route: '/gap-move/services/delivery', description: 'Dịch vụ chính cho tài liệu, hàng nhỏ và giao nhiều điểm.' },
        { label: 'Xe tải / xe van', route: '/gap-move/services/truck', description: 'Vận chuyển hàng cồng kềnh, van và tải nhẹ.' },
        { label: 'Đa đơn - Đa điểm', route: '/gap-move/multi-stop', description: 'Nhập nhiều điểm giao trên một màn hình, phù hợp shop và kho.', badge: 'Mới' },
        { label: 'Bê hộ hàng', route: '/gap-move/services/porter', description: 'Thuê người bê hàng độc lập hoặc đi kèm chuyến xe.', badge: 'Mới' },
        { label: 'Chuyển nhà mini', route: '/gap-move/services/moving', description: 'Đóng gói, tháo lắp, bốc xếp và vận chuyển.' },
      ],
    },
    {
      label: 'Khách hàng',
      items: [
        { label: 'Khách hàng cá nhân', route: '/gap-move/customers/personal' },
        { label: 'Khách hàng doanh nghiệp', route: '/gap-move/customers/business' },
        { label: 'Ưu đãi & thành viên', route: '/gap-move/customers/rewards' },
        { label: 'Trung tâm hỗ trợ', route: '/gap-move/customers/support' },
      ],
    },
    {
      label: 'Tài xế',
      items: [
        { label: 'Đăng ký tài xế mới', route: '/gap-move/driver/register' },
        { label: 'Cộng đồng tài xế', route: '/gap-move/driver/community' },
        { label: 'Cẩm nang tài xế', route: '/gap-move/driver/guide' },
        { label: 'Chương trình xe điện 2026', route: '/gap-move/driver/ev-2026', badge: 'Mới' },
      ],
    },
    {
      label: 'Tuyển dụng',
      items: [
        { label: 'Về chúng tôi', route: '/gap-move/careers/about' },
        { label: 'Câu chuyện GapMovers', route: '/gap-move/careers/stories' },
        { label: 'Gia nhập GapMove ngay', route: '/gap-move/careers/join' },
      ],
    },
    {
      label: 'Tin tức',
      items: [
        { label: 'Tin tức GapMove', route: '/gap-move/news', description: 'Cập nhật vận hành và ưu đãi mới nhất.' },
        { label: 'Thông tin dịch vụ', route: '/gap-move/news/service', description: 'Quy định giao hàng, xe tải và bê hộ hàng.' },
        { label: 'Blog kinh doanh', route: '/gap-move/news/business', description: 'Gợi ý vận hành giao nhận cho shop và doanh nghiệp.' },
        { label: 'Báo cáo', route: '/gap-move/news/reports' },
      ],
    },
  ];

  private userSub?: Subscription;
  private addressSub?: Subscription;

  constructor(
    private navCtrl: NavController,
    private authService: GmAuthService,
    private locationService: GmLocationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user) => (this.user = user));
    this.addressSub = this.locationService.getAddress().subscribe((address) => (this.currentAddress = address));
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.addressSub?.unsubscribe();
  }

  goBack(): void {
    window.history.back();
  }

  goToLogin(): void {
    this.navCtrl.navigateForward('/gap-move/login');
  }

  goToProfile(): void {
    this.navCtrl.navigateForward('/gap-move/profile');
  }

  logout(): void {
    this.authService.logout().subscribe(() => this.navCtrl.navigateForward('/gap-move/home'));
  }

  goToOrder(): void {
    this.router.navigate(['/gap-move/booking/new'], { queryParams: { type: 'delivery' } });
  }
}
