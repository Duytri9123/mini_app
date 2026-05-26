import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GmDriver } from '../../core/interfaces/driver.interface';
import { GmDriverService } from '../../core/services/gm-driver.service';
import { GmMapComponent } from '../../shared/components/gm-map/gm-map.component';

@Component({
  selector: 'app-gm-drivers',
  standalone: true,
  imports: [CommonModule, GmMapComponent],
  templateUrl: './gm-drivers.page.html',
})
export class GmDriversPage {
  drivers$ = this.driverService.getNearbyDrivers();

  constructor(
    private driverService: GmDriverService,
    private router: Router,
  ) {}

  book(driver: GmDriver): void {
    this.router.navigate(['/gap-move/booking/new'], { queryParams: { vehicleType: driver.vehicle.vehicleType } });
  }
}
