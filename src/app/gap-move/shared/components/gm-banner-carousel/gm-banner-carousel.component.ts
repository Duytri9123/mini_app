import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GmBanner } from '../../../core/interfaces/banner.interface';

@Component({
  selector: 'app-gm-banner-carousel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './gm-banner-carousel.component.html',
})
export class GmBannerCarouselComponent {
  @Input() banners: GmBanner[] | null = [];
}
