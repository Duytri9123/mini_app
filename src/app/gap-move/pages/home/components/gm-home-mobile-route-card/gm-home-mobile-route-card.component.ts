import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { GmHomeAddressDetails, GmHomeAddressField, GmHomeRouteDragGhost } from '../../gm-home.types';

@Component({
  selector: 'app-gm-home-mobile-route-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './gm-home-mobile-route-card.component.html',
  styleUrls: ['./gm-home-mobile-route-card.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class GmHomeMobileRouteCardComponent {
  @Input() pickupAddress = '';
  @Input() pickupDetails: GmHomeAddressDetails | null = null;
  @Input() dropoffAddress = '';
  @Input() dropoffDetails: GmHomeAddressDetails | null = null;
  @Input() dropoffPlaceholder = 'Đến';
  @Input() stopAddresses: string[] = [];
  @Input() stopDetails: GmHomeAddressDetails[] = [];
  @Input() routeDragGhost: GmHomeRouteDragGhost | null = null;
  @Input() routeDragPlaceholderIndex: number | null = null;
  @Input() routeDragArmedIndex: number | null = null;
  @Input() scheduleButtonLabel = '';

  @Output() armRouteDrag = new EventEmitter<{ index: number; event: PointerEvent }>();
  @Output() startRouteDrag = new EventEmitter<{ index: number; event: PointerEvent }>();
  @Output() routeAddressSearch = new EventEmitter<{ field: GmHomeAddressField; stopIndex: number | null; event: MouseEvent }>();
  @Output() removeStop = new EventEmitter<number>();
  @Output() clearDropoff = new EventEmitter<void>();
  @Output() addStop = new EventEmitter<void>();
  @Output() swapRoutePoints = new EventEmitter<void>();
  @Output() openScheduleSheet = new EventEmitter<void>();

  get canReorderRoute(): boolean {
    return this.stopAddresses.length + 2 > 1;
  }

  isRouteDragPlaceholder(index: number): boolean {
    return this.routeDragPlaceholderIndex === index;
  }

  isRouteDragArmed(index: number): boolean {
    return this.routeDragArmedIndex === index;
  }

  onArmRouteDrag(index: number, event: PointerEvent): void {
    if (!this.canReorderRoute) {
      return;
    }
    this.armRouteDrag.emit({ index, event });
  }

  onStartRouteDrag(index: number, event: PointerEvent): void {
    if (!this.canReorderRoute) {
      return;
    }
    this.startRouteDrag.emit({ index, event });
  }

  onRouteAddressSearch(field: GmHomeAddressField, stopIndex: number | null, event: MouseEvent): void {
    this.routeAddressSearch.emit({ field, stopIndex, event });
  }

  getStopDetails(index: number): GmHomeAddressDetails | null {
    return this.stopDetails[index] ?? null;
  }

  hasRouteDetails(details: GmHomeAddressDetails | null | undefined): boolean {
    return Boolean(this.getContactText(details));
  }

  getContactText(details: GmHomeAddressDetails | null | undefined): string {
    const contactName = details?.contactName.trim() ?? '';
    const phone = details?.phone.trim() ?? '';
    return [contactName, phone].filter(Boolean).join(' · ');
  }

}
