import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { GmCoordinate, GmCustomerAddress } from '../../../core/interfaces/location.interface';
import { GmAddressSearchResult } from '../../../core/services/gm-geocoding.service';

export interface GmLocationSearchHistoryItem {
  id: string;
  address: string;
  coordinate?: GmCoordinate;
  detailsText?: string;
  data?: unknown;
}

@Component({
  selector: 'app-gm-location-search-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './gm-location-search-picker.component.html',
})
export class GmLocationSearchPickerComponent {
  @Input() query = '';
  @Input() placeholder = '';
  @Input() currentAddress = '';
  @Input() searchResults: GmAddressSearchResult[] = [];
  @Input() confirmedHistory: GmLocationSearchHistoryItem[] = [];
  @Input() savedAddresses: GmCustomerAddress[] = [];
  @Input() savedAddressesLoading = false;
  @Input() isSavedAddressesOpen = false;
  @Input() mobileOnly = false;
  @Input() getSavedAddressDetailsText: (address: GmCustomerAddress) => string = () => '';

  @Output() closePicker = new EventEmitter<void>();
  @Output() queryChange = new EventEmitter<string>();
  @Output() queryInput = new EventEmitter<void>();
  @Output() useCurrentLocation = new EventEmitter<void>();
  @Output() chooseMap = new EventEmitter<void>();
  @Output() selectSearchResult = new EventEmitter<GmAddressSearchResult>();
  @Output() toggleSavedAddresses = new EventEmitter<void>();
  @Output() selectSavedAddress = new EventEmitter<GmCustomerAddress>();
  @Output() selectConfirmedHistory = new EventEmitter<GmLocationSearchHistoryItem>();

  updateQuery(value: string): void {
    this.query = value;
    this.queryChange.emit(value);
    this.queryInput.emit();
  }
}
