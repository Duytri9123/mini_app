import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { GmCoordinate, GmCustomerAddress } from '../../core/interfaces/location.interface';
import { GmCustomerAddressService } from '../../core/services/gm-customer-address.service';
import { GmAddressSearchResult, GmGeocodingService } from '../../core/services/gm-geocoding.service';
import { GmToastService } from '../../core/services/gm-toast.service';
import { GmSavedAddressEditorComponent } from './components/gm-saved-address-editor.component';
import { GmSavedAddressListComponent } from './components/gm-saved-address-list.component';

@Component({
  selector: 'app-gm-saved-addresses',
  standalone: true,
  imports: [CommonModule, IonicModule, GmSavedAddressListComponent, GmSavedAddressEditorComponent],
  templateUrl: './gm-saved-addresses.page.html',
})
export class GmSavedAddressesPage implements OnInit, OnDestroy {
  addresses: GmCustomerAddress[] = [];
  isLoading = false;
  isEditorOpen = false;
  isSaving = false;
  isLocating = false;
  editingAddress?: GmCustomerAddress;
  addressLabel = '';
  addressUnit = '';
  addressPhone = '';
  addressContactName = '';
  addressNote = '';
  addressIsDefault = false;
  searchQuery = '';
  searchResults: GmAddressSearchResult[] = [];
  pendingSelection?: GmAddressSearchResult;

  private addressSub?: Subscription;
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private customerAddressService: GmCustomerAddressService,
    private geocodingService: GmGeocodingService,
    private toastService: GmToastService,
  ) {}

  get editorTitle(): string {
    return this.editingAddress ? 'Cập nhật địa chỉ đã lưu' : 'Thêm địa chỉ đã lưu';
  }

  get editorCoordinate(): GmCoordinate | undefined {
    return this.pendingSelection?.coordinate;
  }

  get pendingAddress(): string {
    return this.pendingSelection?.address ?? '';
  }

  ngOnInit(): void {
    this.loadAddresses();
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
    this.addressSub?.unsubscribe();
  }

  loadAddresses(): void {
    this.isLoading = true;
    this.addressSub?.unsubscribe();
    this.addressSub = this.customerAddressService.getAddresses().subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        this.isLoading = false;
      },
      error: () => {
        this.addresses = [];
        this.isLoading = false;
        this.toastService.error('Không tải được địa chỉ đã lưu');
      },
    });
  }

  goBack(): void {
    window.history.back();
  }

  openCreate(): void {
    this.editingAddress = undefined;
    this.addressLabel = '';
    this.addressUnit = '';
    this.addressPhone = '';
    this.addressContactName = '';
    this.addressNote = '';
    this.addressIsDefault = !this.addresses.length;
    this.searchQuery = '';
    this.searchResults = [];
    this.pendingSelection = undefined;
    this.isEditorOpen = true;
  }

  openEdit(address: GmCustomerAddress): void {
    this.editingAddress = address;
    const details = this.customerAddressService.getAddressDetails(address);
    this.addressLabel = address.label ?? '';
    this.addressUnit = details.unit;
    this.addressPhone = details.phone;
    this.addressContactName = details.contactName;
    this.addressNote = details.note;
    this.addressIsDefault = address.is_default;
    this.searchQuery = address.address;
    this.searchResults = [];
    this.pendingSelection = {
      address: address.address,
      coordinate: this.customerAddressService.toCoordinate(address),
    };
    this.isEditorOpen = true;
  }

  closeEditor(): void {
    if (this.isSaving) {
      return;
    }

    this.isEditorOpen = false;
    this.searchResults = [];
    this.pendingSelection = undefined;
    this.editingAddress = undefined;
    this.addressUnit = '';
    this.addressPhone = '';
    this.addressContactName = '';
    this.addressNote = '';
  }

  onSearchInput(): void {
    clearTimeout(this.searchTimer);
    const query = this.searchQuery.trim();
    if (query.length < 2) {
      this.searchResults = [];
      return;
    }

    this.searchTimer = setTimeout(() => {
      this.geocodingService.searchAddress(query).subscribe((results) => {
        this.searchResults = results.slice(0, 5);
      });
    }, 250);
  }

  useSearchResult(result: GmAddressSearchResult): void {
    this.searchResults = [];
    this.searchQuery = result.address;
    this.geocodingService.resolveAddress(result).subscribe((resolved) => {
      this.pendingSelection = resolved;
      this.searchQuery = resolved.address;
    });
  }

  useMapCoordinate(coordinate: GmCoordinate): void {
    const fallback: GmAddressSearchResult = {
      address: coordinate.address || 'Vị trí đã chọn trên bản đồ',
      coordinate,
    };

    this.pendingSelection = fallback;
    this.searchQuery = fallback.address;
    this.geocodingService.reverseGeocode(coordinate.lat, coordinate.lng).subscribe((result) => {
      if (result) {
        this.pendingSelection = result;
        this.searchQuery = result.address;
      }
    });
  }

  locateEditor(): void {
    if (!navigator.geolocation) {
      this.toastService.error('Trình duyệt chưa hỗ trợ lấy vị trí hiện tại');
      return;
    }

    this.isLocating = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinate: GmCoordinate = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: 'Đang xác định địa chỉ hiện tại...',
        };
        this.useMapCoordinate(coordinate);
        this.isLocating = false;
      },
      () => {
        this.isLocating = false;
        this.toastService.error('Không lấy được vị trí hiện tại');
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 },
    );
  }

  saveEditor(): void {
    const coordinate = this.pendingSelection?.coordinate;
    const address = this.pendingSelection?.address.trim();
    if (!coordinate || !address) {
      this.toastService.error('Vui lòng chọn và xác nhận vị trí trên bản đồ');
      return;
    }

    this.isSaving = true;
    const payload = {
      label: this.addressLabel.trim() || null,
      address,
      lat: coordinate.lat,
      lng: coordinate.lng,
      unit: '',
      phone: this.addressPhone.trim(),
      contactName: this.addressContactName.trim(),
      contact_name: this.addressContactName.trim(),
      note: this.addressNote.trim(),
      is_default: this.addressIsDefault,
    };

    const request = this.editingAddress
      ? this.customerAddressService.updateAddress(this.editingAddress.id, payload)
      : this.customerAddressService.createAddress(payload);

    request.subscribe({
      next: (savedAddress) => {
        this.isSaving = false;
        this.isEditorOpen = false;
        this.upsertAddress(savedAddress);
        this.toastService.success(this.editingAddress ? 'Đã cập nhật địa chỉ' : 'Đã lưu địa chỉ');
        this.editingAddress = undefined;
      },
      error: () => {
        this.isSaving = false;
        this.toastService.error('Không lưu được địa chỉ');
      },
    });
  }

  setDefault(address: GmCustomerAddress): void {
    this.customerAddressService.setDefault(address.id).subscribe({
      next: (updated) => {
        this.addresses = this.addresses.map((item) => ({
          ...item,
          is_default: item.id === updated.id,
        }));
      },
      error: () => this.toastService.error('Không đặt được địa chỉ mặc định'),
    });
  }

  deleteAddress(address: GmCustomerAddress): void {
    this.customerAddressService.deleteAddress(address.id).subscribe({
      next: () => {
        this.addresses = this.addresses.filter((item) => item.id !== address.id);
        this.toastService.success('Đã xóa địa chỉ');
        this.loadAddresses();
      },
      error: () => this.toastService.error('Không xóa được địa chỉ'),
    });
  }

  private upsertAddress(address: GmCustomerAddress): void {
    const next = this.addresses.some((item) => item.id === address.id)
      ? this.addresses.map((item) => (item.id === address.id ? address : item))
      : [address, ...this.addresses];

    this.addresses = address.is_default
      ? next.map((item) => ({
          ...item,
          is_default: item.id === address.id,
        }))
      : next;
  }
}
