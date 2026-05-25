import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BjAuthService } from '../../core/services/bj-auth.service';
import { BjBannerService } from '../../core/services/bj-banner.service';
import { BjStationService } from '../../core/services/bj-station.service';
import { BjLocationService } from '../../core/services/bj-location.service';
import { map, take } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { BjStationCardComponent } from '../../shared/components/bj-station-card/bj-station-card.component';
import { BjBannerCarouselComponent } from '../../shared/components/bj-banner-carousel/bj-banner-carousel.component';
import { BjServiceProcessComponent } from '../../shared/components/bj-service-process/bj-service-process.component';
import { BjArticlesComponent } from '../../shared/components/bj-articles/bj-articles.component';
import { BjStation } from '../../core/interfaces/station.interface';
import { BjBanner } from '../../core/interfaces/banner.interface';

@Component({
  selector: 'bj-home',
  standalone: true,
  imports: [CommonModule, BjStationCardComponent, BjBannerCarouselComponent, BjServiceProcessComponent, BjArticlesComponent],
  templateUrl: './bj-home.page.html',
  styleUrls: ['./bj-home.page.scss'],
})
export class BjHomePage implements OnInit {
  userName$: Observable<string>;
  banners$: Observable<BjBanner[]> = of([]);
  nearestStations: BjStation[] = [];
  hasGpsPermission: boolean = false;

  // Video modal
  isVideoModalOpen = false;
  youtubeEmbedUrl!: SafeResourceUrl;
  private readonly YOUTUBE_VIDEO_ID = 'dDI31_ICUbk';

  // fallback coords (Hà Nội) nếu chưa có GPS
  private _userLat = 21.0285;
  private _userLng = 105.8542;

  constructor(
    public authService: BjAuthService,
    private bannerService: BjBannerService,
    private stationService: BjStationService,
    private locationService: BjLocationService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {
    this.userName$ = this.authService.currentUser$.pipe(
      map(user => user?.fullName?.split(' ')[0] || 'Guest')
    );
  }

  ngOnInit() {
    this.banners$ = this.bannerService.getBanners().pipe(
      map(resp => resp.data)
    );

    // Lấy vị trí từ service (đã có cache)
    const currentLoc = this.locationService.getCurrent();
    if (currentLoc) {
      this._userLat = currentLoc.lat;
      this._userLng = currentLoc.lng;
      this.hasGpsPermission = this.locationService.hasGpsPermission;
      this._loadNearestStations();
    } else {
      // Nếu chưa có thì mới refresh/lấy mới
      this.locationService.refresh().then(pos => {
        this._userLat = pos.lat;
        this._userLng = pos.lng;
        this.hasGpsPermission = this.locationService.hasGpsPermission;
        this._loadNearestStations();
      });
    }
  }

  private _loadNearestStations(): void {
    this.stationService.getStations(this._userLat, this._userLng).subscribe(stations => {
      this.nearestStations = [...stations]
        .filter(s => s.status === 'active')
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
        .slice(0, 4);
    });
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  onCardClick(station: BjStation): void {
    this.router.navigate(['/bro-jet/explore'], { queryParams: { stationId: station.id } });
  }

  onBookClick(station: BjStation): void {
    this.router.navigate(['/bro-jet/booking/new'], { queryParams: { stationId: station.id } });
  }

  goToMap(): void {
    this.router.navigate(['/bro-jet/explore']);
  }

  openVideoModal(): void {
    const url = `https://www.youtube.com/embed/${this.YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&playsinline=1`;
    this.youtubeEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.isVideoModalOpen = true;
    document.body.classList.add('video-modal-open');
  }

  closeVideoModal(): void {
    this.isVideoModalOpen = false;
    document.body.classList.remove('video-modal-open');
  }
}



