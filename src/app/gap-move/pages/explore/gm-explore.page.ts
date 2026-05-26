import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { GmDriverService } from '../../core/services/gm-driver.service';
import { GmDriver } from '../../core/interfaces/driver.interface';
import { GmMapComponent } from '../../shared/components/gm-map/gm-map.component';
import { GM_DEFAULT_CENTER } from '../../core/constants/gm-map.constants';

@Component({
  selector: 'app-gm-explore',
  standalone: true,
  imports: [CommonModule, RouterModule, GmMapComponent],
  templateUrl: './gm-explore.page.html',
})
export class GmExplorePage {
  drivers$ = this.driverService.getNearbyDrivers();
  center = GM_DEFAULT_CENTER;

  constructor(
    private driverService: GmDriverService,
    private router: Router,
  ) {}

  bookWithDriver(driver: GmDriver): void {
    this.router.navigate(['/gap-move/booking/new'], { queryParams: { vehicleType: driver.vehicle.vehicleType } });
  }
}
