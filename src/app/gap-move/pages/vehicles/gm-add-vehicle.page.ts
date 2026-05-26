import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GmVehicleType } from '../../core/interfaces/vehicle.interface';
import { GmToastService } from '../../core/services/gm-toast.service';
import { GmVehicleService } from '../../core/services/gm-vehicle.service';

@Component({
  selector: 'app-gm-add-vehicle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gm-add-vehicle.page.html',
})
export class GmAddVehiclePage {
  name = '';
  licensePlate = '';
  vehicleType: GmVehicleType = 'motorbike';
  brand = '';
  model = '';

  constructor(
    private vehicleService: GmVehicleService,
    private toastService: GmToastService,
    private router: Router,
  ) {}

  submit(): void {
    this.vehicleService.addVehicle({
      name: this.name || 'Phuong tien moi',
      licensePlate: this.licensePlate || 'Chua cap nhat',
      vehicleType: this.vehicleType,
      brand: this.brand,
      model: this.model,
      isDefault: false,
    });
    this.toastService.success('Da them phuong tien');
    this.router.navigateByUrl('/gap-move/vehicles');
  }
}
