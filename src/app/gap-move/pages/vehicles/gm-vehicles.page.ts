import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GmVehicleService } from '../../core/services/gm-vehicle.service';

@Component({
  selector: 'app-gm-vehicles',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './gm-vehicles.page.html',
})
export class GmVehiclesPage {
  vehicles$ = this.vehicleService.getVehicles();

  constructor(private vehicleService: GmVehicleService) {}
}
