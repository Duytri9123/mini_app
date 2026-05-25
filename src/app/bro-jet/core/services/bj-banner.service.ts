import { Injectable } from '@angular/core';
import { BjApiService } from './bj-api.service';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { BjBannerResponse } from '../interfaces/banner.interface';
import { tap, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BjBannerService {
  private _banners$ = new BehaviorSubject<BjBannerResponse | null>(null);

  constructor(private apiService: BjApiService) {}

  getBanners(forceRefresh = false): Observable<BjBannerResponse> {
    if (!forceRefresh && this._banners$.value) {
      return of(this._banners$.value);
    }

    return (this.apiService.get('banners') as Observable<BjBannerResponse>).pipe(
      tap(resp => this._banners$.next(resp))
    );
  }
}
