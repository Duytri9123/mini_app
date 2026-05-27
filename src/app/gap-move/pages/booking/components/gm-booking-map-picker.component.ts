import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { GmCoordinate } from '../../../core/interfaces/location.interface';
import { GmAddressSearchResult } from '../../../core/services/gm-geocoding.service';
import { GmMapComponent, GmMapMarkerDragEvent } from '../../../shared/components/gm-map/gm-map.component';
import { GmBookingAddressField, GmBookingAddressTarget } from './gm-booking-location.types';

@Component({
  selector: 'app-gm-booking-map-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, GmMapComponent],
  templateUrl: './gm-booking-map-picker.component.html',
})
export class GmBookingMapPickerComponent {
  @Input() activeAddressField: GmBookingAddressField = 'pickup';
  @Input() activeStopIndex: number | null = null;
  @Input() pickup?: GmCoordinate | null;
  @Input() dropoff?: GmCoordinate | null;
  @Input() stops: GmCoordinate[] = [];
  @Input() stopIndexes: number[] = [];
  @Input() pendingAddress = '';
  @Input() searchQuery = '';
  @Input() searchResults: GmAddressSearchResult[] = [];
  @Input() isLocating = false;

  @Output() closePicker = new EventEmitter<void>();
  @Output() confirmSelection = new EventEmitter<void>();
  @Output() locate = new EventEmitter<void>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() searchInput = new EventEmitter<void>();
  @Output() useSearchResult = new EventEmitter<GmAddressSearchResult>();
  @Output() selectCoordinate = new EventEmitter<GmCoordinate>();
  @Output() markerDragEnd = new EventEmitter<GmMapMarkerDragEvent>();
  @Output() switchField = new EventEmitter<GmBookingAddressTarget>();

  get title(): string {
    if (this.activeAddressField === 'pickup') {
      return 'Chọn điểm lấy / đón';
    }
    if (this.activeAddressField === 'stop') {
      return `Chọn điểm dừng ${(this.activeStopIndex ?? 0) + 1}`;
    }
    return 'Chọn điểm giao / đến';
  }

  updateSearchQuery(value: string): void {
    this.searchQuery = value;
    this.searchQueryChange.emit(value);
    this.searchInput.emit();
  }
}
