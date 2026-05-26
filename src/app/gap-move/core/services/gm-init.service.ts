import { Injectable } from '@angular/core';
import { GmLocationService } from './gm-location.service';

@Injectable({ providedIn: 'root' })
export class GmInitService {
  private initialized = false;

  constructor(private locationService: GmLocationService) {}

  init(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    void this.locationService.refresh();
  }
}
