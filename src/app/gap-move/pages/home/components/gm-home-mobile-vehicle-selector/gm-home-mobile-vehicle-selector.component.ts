import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { formatVnd } from '../../../../core/utils/helpers';
import { GmHomeDeliveryPackage, GmHomeMode, GmHomeVehicleOption } from '../../gm-home.types';

@Component({
  selector: 'app-gm-home-mobile-vehicle-selector',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './gm-home-mobile-vehicle-selector.component.html',
  styleUrls: ['./gm-home-mobile-vehicle-selector.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class GmHomeMobileVehicleSelectorComponent {
  @Input() activeMobileMode: GmHomeMode = 'delivery';
  @Input() vehicles: GmHomeVehicleOption[] = [];
  @Input() selectedVehicleId = '';
  @Input() selectedVehicle: GmHomeVehicleOption | null = null;
  @Input() deliveryPackages: GmHomeDeliveryPackage[] = [];
  @Input() selectedDeliveryPackageId: GmHomeDeliveryPackage['id'] = 'standard';
  @Input() stopCount = 0;
  @Input() isRouteReadyForServices = false;

  @Output() vehicleSelect = new EventEmitter<GmHomeVehicleOption>();
  @Output() deliveryPackageSelect = new EventEmitter<GmHomeDeliveryPackage>();
  @Output() bookNow = new EventEmitter<void>();

  get modeLabel(): string {
    return this.activeMobileMode === 'delivery' ? 'Giao hàng' : 'Đặt xe';
  }

  get selectedVehicleIndex(): number {
    return this.vehicles.findIndex((vehicle) => vehicle.id === this.selectedVehicleId);
  }

  shouldRenderVehicleDetailsAfter(index: number): boolean {
    if (!this.selectedVehicle || this.selectedVehicleIndex < 0) {
      return false;
    }

    const isEndOfRow = index % 2 === 1 || index === this.vehicles.length - 1;
    return isEndOfRow && Math.floor(index / 2) === Math.floor(this.selectedVehicleIndex / 2);
  }

  selectVehicle(vehicle: GmHomeVehicleOption): void {
    this.vehicleSelect.emit(vehicle);
  }

  selectDeliveryPackage(packageOption: GmHomeDeliveryPackage): void {
    this.deliveryPackageSelect.emit(packageOption);
  }

  formatDeliveryPackagePrice(packageOption: GmHomeDeliveryPackage): string {
    const base = this.selectedVehicle?.priceBase ?? 78000;
    const stopSurcharge = this.stopCount * 12000;
    return formatVnd(Math.round((base + stopSurcharge) * packageOption.priceMultiplier));
  }
}
