import { Component, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BjBanner } from '../../../core/interfaces/banner.interface';

// Import Swiper modules
import { register } from 'swiper/element/bundle';
register();

@Component({
  selector: 'app-bj-banner-carousel',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // cần thiết để dùng <swiper-container>
  templateUrl: './bj-banner-carousel.component.html',
  styleUrls: ['./bj-banner-carousel.component.scss']
})
export class BjBannerCarouselComponent {
  @Input() banners: BjBanner[] | null = null;
}