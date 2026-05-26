import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GM_DEFAULT_CENTER } from '../constants/gm-map.constants';
import { GmCoordinate } from '../interfaces/location.interface';

@Injectable({ providedIn: 'root' })
export class GmLocationService {
  private readonly current$ = new BehaviorSubject<GmCoordinate>({ ...GM_DEFAULT_CENTER });
  readonly address$ = new BehaviorSubject<string>(GM_DEFAULT_CENTER.address);

  hasGpsPermission = false;

  getCurrent(): GmCoordinate {
    return this.current$.getValue();
  }

  getAddress() {
    return this.address$.asObservable();
  }

  refresh(): Promise<GmCoordinate> {
    this.hasGpsPermission = true;
    const coordinate = { ...GM_DEFAULT_CENTER, address: 'Quan 1, Ho Chi Minh City' };
    this.current$.next(coordinate);
    this.address$.next(coordinate.address || GM_DEFAULT_CENTER.address);
    return Promise.resolve(coordinate);
  }
}
