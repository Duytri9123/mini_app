import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { GmBookingType } from '../../../core/interfaces/booking.interface';
import { GmCustomerAddress } from '../../../core/interfaces/location.interface';
import { GmAddressSearchResult } from '../../../core/services/gm-geocoding.service';
import {
  GmBookingAddressTarget,
  GmBookingDestinationPointMove,
  GmBookingSavedAddressSelection,
  GmBookingStopAddressChange,
  GmBookingSuggestionSelection,
} from './gm-booking-location.types';

@Component({
  selector: 'app-gm-booking-route-form',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './gm-booking-route-form.component.html',
})
export class GmBookingRouteFormComponent {
  @Input() type: GmBookingType = 'delivery';
  @Input() pickupAddress = '';
  @Input() dropoffAddress = '';
  @Input() stopAddresses: string[] = [];
  @Input() pickupSuggestions: GmAddressSearchResult[] = [];
  @Input() dropoffSuggestions: GmAddressSearchResult[] = [];
  @Input() stopSuggestions: GmAddressSearchResult[][] = [];
  @Input() savedAddresses: GmCustomerAddress[] = [];
  @Input() savedAddressesLoading = false;
  @Input() isRouteReorderMode = false;

  @Output() pickupAddressChange = new EventEmitter<string>();
  @Output() dropoffAddressChange = new EventEmitter<string>();
  @Output() stopAddressChange = new EventEmitter<GmBookingStopAddressChange>();
  @Output() pickupInput = new EventEmitter<void>();
  @Output() dropoffInput = new EventEmitter<void>();
  @Output() stopInput = new EventEmitter<number>();
  @Output() addStop = new EventEmitter<void>();
  @Output() removeStop = new EventEmitter<number>();
  @Output() toggleRouteReorder = new EventEmitter<void>();
  @Output() moveDestinationPoint = new EventEmitter<GmBookingDestinationPointMove>();
  @Output() openMap = new EventEmitter<GmBookingAddressTarget>();
  @Output() useSuggestion = new EventEmitter<GmBookingSuggestionSelection>();
  @Output() useSavedAddress = new EventEmitter<GmBookingSavedAddressSelection>();

  isSavedAddressOpen = false;
  activeTarget: GmBookingAddressTarget = { field: 'dropoff' };
  private routeDragIndex: number | null = null;

  get activeTargetLabel(): string {
    if (this.activeTarget.field === 'pickup') {
      return this.type === 'porter' ? 'điểm bê hàng' : 'điểm lấy';
    }
    if (this.activeTarget.field === 'stop') {
      return `điểm dừng ${(this.activeTarget.stopIndex ?? 0) + 1}`;
    }
    return this.type === 'porter' ? 'điểm hoàn tất' : 'điểm giao';
  }

  setActiveTarget(target: GmBookingAddressTarget): void {
    this.activeTarget = target;
  }

  openMapFor(target: GmBookingAddressTarget): void {
    this.setActiveTarget(target);
    this.openMap.emit(target);
  }

  selectSavedAddress(address: GmCustomerAddress): void {
    this.useSavedAddress.emit({
      ...this.activeTarget,
      address,
    });
  }

  movePoint(fromIndex: number, toIndex: number): void {
    this.moveDestinationPoint.emit({ fromIndex, toIndex });
  }

  startRouteDrag(index: number): void {
    if (!this.isRouteReorderMode) {
      return;
    }

    this.routeDragIndex = index;
  }

  allowRouteDrop(event: DragEvent): void {
    if (!this.isRouteReorderMode) {
      return;
    }

    event.preventDefault();
  }

  dropRoutePoint(index: number, event: DragEvent): void {
    if (!this.isRouteReorderMode || this.routeDragIndex === null) {
      return;
    }

    event.preventDefault();
    this.movePoint(this.routeDragIndex, index);
    this.routeDragIndex = null;
  }

  endRouteDrag(): void {
    this.routeDragIndex = null;
  }
}
