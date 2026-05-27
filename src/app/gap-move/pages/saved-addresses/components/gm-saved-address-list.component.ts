import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { GmCustomerAddress } from '../../../core/interfaces/location.interface';

@Component({
  selector: 'app-gm-saved-address-list',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './gm-saved-address-list.component.html',
})
export class GmSavedAddressListComponent {
  @Input() addresses: GmCustomerAddress[] = [];
  @Input() isLoading = false;

  @Output() addAddress = new EventEmitter<void>();
  @Output() editAddress = new EventEmitter<GmCustomerAddress>();
  @Output() setDefaultAddress = new EventEmitter<GmCustomerAddress>();
  @Output() deleteAddress = new EventEmitter<GmCustomerAddress>();
}
