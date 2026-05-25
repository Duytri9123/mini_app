import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BjVehicle, VehicleType } from '../../../core/interfaces/vehicle.interface';
import { getImageUrl, handleImageError } from '../../../../../environments/environment';

@Component({
  selector: 'app-bj-vehicle-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-vehicle-card.component.html',
})
export class BjVehicleCardComponent {
  @Input() vehicle!: BjVehicle;
  @Input() selected: boolean = false;
  @Input() showActions: boolean = true;

  @Output() selectClick = new EventEmitter<BjVehicle>();
  @Output() editClick = new EventEmitter<BjVehicle>();
  @Output() deleteClick = new EventEmitter<BjVehicle>();
  @Output() setDefaultClick = new EventEmitter<BjVehicle>();

  get symbolIcon(): string {
    const iconMap: Record<VehicleType, string> = {
      sedan: 'directions_car',
      suv: 'suv',
      truck: 'truck',
      electric: 'electric_car',
    };
    return iconMap[this.vehicle?.vehicleType] ?? 'directions_car';
  }

  get typeLabel(): string {
    const labelMap: Record<VehicleType, string> = {
      sedan: 'Ô tô',
      suv: 'SUV',
      truck: 'Xe tải',
      electric: 'Xe điện',
    };
    return labelMap[this.vehicle?.vehicleType] ?? 'Ô tô';
  }

  getFullImageUrl(path: string | null): string {
    return path ? getImageUrl(path) : '';
  }

  onImageError(event: Event): void {
    handleImageError(event);
  }

  onSelect(): void {
    this.selectClick.emit(this.vehicle);
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.editClick.emit(this.vehicle);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.deleteClick.emit(this.vehicle);
  }

  onSetDefault(event: Event): void {
    event.stopPropagation();
    this.setDefaultClick.emit(this.vehicle);
  }
}
