import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
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
  styleUrls: ['./gm-booking-route-form.component.scss'],
})
export class GmBookingRouteFormComponent {
  @ViewChild('routeList') private routeList?: ElementRef<HTMLElement>;

  @Input() type: GmBookingType = 'delivery';
  @Input() pickupAddress = '';
  @Input() dropoffAddress = '';
  @Input() dropoffPlaceholder = 'Đến';
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
  @Output() clearDropoff = new EventEmitter<void>();
  @Output() swapRoutePoints = new EventEmitter<void>();
  @Output() toggleRouteReorder = new EventEmitter<void>();
  @Output() moveDestinationPoint = new EventEmitter<GmBookingDestinationPointMove>();
  @Output() openMap = new EventEmitter<GmBookingAddressTarget>();
  @Output() useSuggestion = new EventEmitter<GmBookingSuggestionSelection>();
  @Output() useSavedAddress = new EventEmitter<GmBookingSavedAddressSelection>();

  isSavedAddressOpen = false;
  activeTarget: GmBookingAddressTarget = { field: 'dropoff' };
  routeDragIndex: number | null = null;
  routeDragOffsetY = 0;
  private routePointerDragIndex: number | null = null;
  private routeDragStartY = 0;
  private routeDragMoved = false;
  private suppressRouteClick = false;

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

  openMapFor(target: GmBookingAddressTarget, event?: Event): void {
    if (this.suppressRouteClick) {
      event?.preventDefault();
      event?.stopPropagation();
      return;
    }

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

  canDragRoutePoints(): boolean {
    return this.stopAddresses.length + 2 > 1;
  }

  routeDragTransform(index: number): string | null {
    if (this.routeDragIndex !== index || !this.routeDragMoved) {
      return null;
    }

    return `translateY(${this.routeDragOffsetY}px)`;
  }

  startRouteDrag(index: number): void {
    this.routeDragIndex = index;
  }

  beginRoutePointerDrag(index: number, event: PointerEvent): void {
    if (!this.canDragRoutePoints() || this.isInteractiveRouteControl(event.target)) {
      return;
    }

    this.routePointerDragIndex = index;
    this.routeDragStartY = event.clientY;
    this.routeDragOffsetY = 0;
    this.routeDragMoved = false;
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
  }

  moveRoutePointerDrag(event: PointerEvent): void {
    if (this.routePointerDragIndex === null) {
      return;
    }

    const offsetY = event.clientY - this.routeDragStartY;
    if (!this.routeDragMoved && Math.abs(offsetY) < 6) {
      return;
    }

    this.routeDragMoved = true;
    this.routeDragIndex = this.routePointerDragIndex;
    this.routeDragOffsetY = offsetY;
    event.preventDefault();
  }

  endRoutePointerDrag(event: PointerEvent): void {
    if (this.routePointerDragIndex === null) {
      return;
    }

    const fromIndex = this.routePointerDragIndex;
    const shouldMove = this.routeDragMoved;
    const toIndex = shouldMove ? this.getRouteDropIndex(event.clientY) : fromIndex;

    (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
    this.resetRoutePointerDrag();

    if (!shouldMove) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.suppressRouteClick = true;
    window.setTimeout(() => {
      this.suppressRouteClick = false;
    }, 0);

    this.movePoint(fromIndex, toIndex);
  }

  cancelRoutePointerDrag(event?: PointerEvent): void {
    if (event && this.routePointerDragIndex !== null) {
      (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
    }
    this.resetRoutePointerDrag();
  }

  allowRouteDrop(event: DragEvent): void {
    event.preventDefault();
  }

  dropRoutePoint(index: number, event: DragEvent): void {
    if (this.routeDragIndex === null) {
      return;
    }

    event.preventDefault();
    this.movePoint(this.routeDragIndex, index);
    this.routeDragIndex = null;
  }

  endRouteDrag(): void {
    this.routeDragIndex = null;
  }

  private resetRoutePointerDrag(): void {
    this.routePointerDragIndex = null;
    this.routeDragIndex = null;
    this.routeDragStartY = 0;
    this.routeDragOffsetY = 0;
    this.routeDragMoved = false;
  }

  private getRouteDropIndex(clientY: number): number {
    const rows = Array.from(this.routeList?.nativeElement.querySelectorAll<HTMLElement>('[data-route-index]') ?? []);
    if (!rows.length) {
      return this.routePointerDragIndex ?? 0;
    }

    let closestIndex = Number(rows[0].dataset['routeIndex'] ?? 0);
    let closestDistance = Number.POSITIVE_INFINITY;
    rows.forEach((row) => {
      const rect = row.getBoundingClientRect();
      const distance = Math.abs(clientY - (rect.top + rect.height / 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = Number(row.dataset['routeIndex'] ?? closestIndex);
      }
    });

    return closestIndex;
  }

  private isInteractiveRouteControl(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && Boolean(target.closest('button, a, input, textarea, select'));
  }
}
