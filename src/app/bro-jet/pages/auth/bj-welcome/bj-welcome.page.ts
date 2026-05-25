import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { BjAuthService } from '../../../core/services/bj-auth.service';
import { BJ_ICONS } from '../../../shared/icons/bj-icons';
import { SafeSvgPipe } from '../../../shared/pipes/safe-svg.pipe';

interface WelcomeSlide {
  title: string;
  description: string;
  image: string;
}

@Component({
  selector: 'app-bj-welcome',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeSvgPipe],
  templateUrl: './bj-welcome.page.html',
  styleUrls: ['../../../shared/styles/bj-auth.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BjWelcomePage {
  readonly icons = BJ_ICONS;
  activeIndex = 0;
  isLoggingOut = false;

  readonly slides: WelcomeSlide[] = [
    {
      title: 'Rửa xe chuyên nghiệp, đặt lịch dễ dàng',
      description: 'Đặt lịch nhanh, chọn trạm gần bạn và theo dõi tiến độ theo thời gian thực.',
      image: 'assets/images/login.png',
    },
    {
      title: 'Thanh toán gọn gàng, ưu đãi rõ ràng',
      description: 'Theo dõi lịch sử giao dịch và nhận ưu đãi dành riêng cho thành viên mới.',
      image: 'assets/images/card.png',
    },
    {
      title: 'Sẵn sàng trải nghiệm cùng Bro Jet',
      description: 'Nhận thông báo về lịch bảo dưỡng, lịch hẹn và nhiều ưu đãi hơn nữa.',
      image: 'assets/images/f1.png',
    },
  ];

  constructor(
    private router: Router,
    private authService: BjAuthService,
  ) {}

  get current(): WelcomeSlide {
    return this.slides[this.activeIndex];
  }

  nextSlide(): void {
    if (this.activeIndex < this.slides.length - 1) {
      this.activeIndex += 1;
      return;
    }
    this.startNow();
  }

  setSlide(index: number): void {
    this.activeIndex = index;
  }

  startNow(): void {
    this.router.navigate(['/bro-jet/home'], { replaceUrl: true });
  }

  logout(): void {
    if (this.isLoggingOut) return;

    this.isLoggingOut = true;
    this.authService.logout().subscribe({
      next: () => {
        this.isLoggingOut = false;
        this.router.navigate(['/bro-jet/login'], { replaceUrl: true });
      },
      error: () => {
        this.isLoggingOut = false;
        this.router.navigate(['/bro-jet/login'], { replaceUrl: true });
      },
    });
  }
}
