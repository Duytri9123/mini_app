import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { GmCoordinate } from '../../../core/interfaces/location.interface';
import { GmAddressSearchResult } from '../../../core/services/gm-geocoding.service';
import { GmMapComponent } from '../../../shared/components/gm-map/gm-map.component';

@Component({
  selector: 'app-gm-saved-address-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, GmMapComponent],
  templateUrl: './gm-saved-address-editor.component.html',
})
export class GmSavedAddressEditorComponent {
  @Input() title = 'Thêm địa chỉ đã lưu';
  @Input() label = '';
  @Input() phone = '';
  @Input() contactName = '';
  @Input() note = '';
  @Input() isDefault = false;
  @Input() searchQuery = '';
  @Input() searchResults: GmAddressSearchResult[] = [];
  @Input() coordinate?: GmCoordinate | null;
  @Input() pendingAddress = '';
  @Input() isLocating = false;
  @Input() isSaving = false;

  @Output() labelChange = new EventEmitter<string>();
  @Output() phoneChange = new EventEmitter<string>();
  @Output() contactNameChange = new EventEmitter<string>();
  @Output() noteChange = new EventEmitter<string>();
  @Output() isDefaultChange = new EventEmitter<boolean>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() searchInput = new EventEmitter<void>();
  @Output() useSearchResult = new EventEmitter<GmAddressSearchResult>();
  @Output() selectCoordinate = new EventEmitter<GmCoordinate>();
  @Output() locate = new EventEmitter<void>();
  @Output() closeEditor = new EventEmitter<void>();
  @Output() saveAddress = new EventEmitter<void>();

  updateSearchQuery(value: string): void {
    this.searchQuery = value;
    this.searchQueryChange.emit(value);
    this.searchInput.emit();
  }
}
