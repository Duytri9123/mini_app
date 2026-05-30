import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { GmCoordinate } from '../../../core/interfaces/location.interface';
import { GmAddressSearchResult } from '../../../core/services/gm-geocoding.service';
import { GmMapComponent, GmMapMarkerDragEvent } from '../gm-map/gm-map.component';

export interface GmLocationMapAddressDetails {
  unit: string;
  phone: string;
  contactName: string;
  note: string;
  saveAddress: boolean;
}

@Component({
  selector: 'app-gm-location-map-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, GmMapComponent],
  templateUrl: './gm-location-map-picker.component.html',
})
export class GmLocationMapPickerComponent {
  @Input() activeAddressField: 'pickup' | 'dropoff' | 'stop' = 'pickup';
  @Input() searchQuery = '';
  @Input() searchResults: GmAddressSearchResult[] = [];
  @Input() pendingAddress = '';
  @Input() hasPendingSelection = false;
  @Input() pickup?: GmCoordinate | null;
  @Input() dropoff?: GmCoordinate | null;
  @Input() stops: GmCoordinate[] = [];
  @Input() stopIndexes: number[] = [];
  @Input() isLocating = false;
  @Input() detailsRequired = false;
  @Input() detailsComplete = true;
  @Input() details: GmLocationMapAddressDetails = {
    unit: '',
    phone: '',
    contactName: '',
    note: '',
    saveAddress: false,
  };

  @Output() closePicker = new EventEmitter<void>();
  @Output() confirmSelection = new EventEmitter<void>();
  @Output() locate = new EventEmitter<void>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() searchInput = new EventEmitter<void>();
  @Output() selectSearchResult = new EventEmitter<GmAddressSearchResult>();
  @Output() selectCoordinate = new EventEmitter<GmCoordinate>();
  @Output() markerDragEnd = new EventEmitter<GmMapMarkerDragEvent>();
  @Output() useContactBook = new EventEmitter<void>();
  @Output() useMyInfo = new EventEmitter<void>();

  isDetailsOpen = false;

  updateSearchQuery(value: string): void {
    this.searchQuery = value;
    this.searchQueryChange.emit(value);
    this.searchInput.emit();
  }

  toggleDetails(): void {
    this.isDetailsOpen = !this.isDetailsOpen;
  }
}
