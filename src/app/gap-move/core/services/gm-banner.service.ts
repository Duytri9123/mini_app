import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { GmBanner } from '../interfaces/banner.interface';

@Injectable({ providedIn: 'root' })
export class GmBannerService {
  getBanners(): Observable<GmBanner[]> {
    return of([
      {
        id: 'banner-1',
        title: 'GapMove Express',
        subtitle: 'Dat xe va giao hang nhanh trong thanh pho',
        imageUrl: 'assets/images/Bg_desktop.png',
        actionUrl: '/gap-move/booking/new',
      },
      {
        id: 'banner-2',
        title: 'Uu dai vi dien tu',
        subtitle: 'Giam gia cho chuyen di thanh toan bang vi GapMove',
        imageUrl: 'assets/images/background_header.png',
        actionUrl: '/gap-move/wallet',
      },
    ]);
  }
}
