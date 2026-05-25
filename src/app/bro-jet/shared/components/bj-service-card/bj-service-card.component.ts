import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BjServicePackage } from '../../../core/interfaces/station.interface';

@Component({
  selector: 'app-bj-service-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-service-card.component.html',
})
export class BjServiceCardComponent {
  @Input() package!: BjServicePackage;
  @Input() selected: boolean = false;

  @Output() selectClick = new EventEmitter<BjServicePackage>();

  get formattedPrice(): string {
    if (this.package?.price == null) return '';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(this.package.price);
  }

  get durationText(): string {
    if (!this.package?.duration_minutes) return '';
    return `${this.package.duration_minutes} phút`;
  }

  onSelect(): void {
    this.selectClick.emit(this.package);
  }
}
