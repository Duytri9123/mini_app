import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { formatVnd } from '../../core/utils/helpers';

interface GmMultiStopRow {
  id: string;
  serviceId: string;
  service: string;
  icon: string;
  address: string;
  receiver: string;
  phone: string;
  cod: number;
  declaredValue: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  trackingCode: string;
}

interface GmMultiStopService {
  id: string;
  group: string;
  label: string;
  description: string;
  icon: string;
}

type GmDropoffFilter = 'all' | 'valid' | 'invalid';
type GmOptimizationMode = 'route' | 'manual';

@Component({
  selector: 'app-gm-multi-stop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonicModule],
  templateUrl: './gm-multi-stop.page.html',
  styleUrls: ['./gm-multi-stop.page.scss'],
})
export class GmMultiStopPage implements OnInit {
  pickupAddress = 'Hoàng Quốc Việt, Foresa 4, Xuân Phương, Nam Từ Liêm, Hà Nội, Việt Nam';
  currentAddress = 'Vị trí hiện tại (2PXW+VM Quận Bắc Từ Liêm, Thành Phố Hà Nội, Vietnam)';
  searchTerm = '';
  addressSearchTerm = '';
  ghlhEnabled = false;
  activeStep = 0;
  rows: GmMultiStopRow[] = [];
  rowMenuId = '';
  addressMenuRowId = '';
  serviceMenuRowId = '';
  isDropoffFilterOpen = false;
  isServiceFilterOpen = false;
  dropoffFilter: GmDropoffFilter = 'all';
  serviceFilter = 'all';
  optimizationMode: GmOptimizationMode = 'route';
  scheduledPickup = '';
  orderNote = '';
  viewMode: 'list' | 'grid' | 'map' = 'list';

  readonly steps = ['Nhập thông tin', 'Cài đặt tối ưu', 'Kiểm tra đơn hàng'];
  readonly serviceOptions: GmMultiStopService[] = [
    {
      id: 'saving',
      group: 'Giao hàng Xe máy',
      label: 'Siêu Tốc - Tiết Kiệm',
      description: 'Giao trong 1 giờ cho đơn 6km',
      icon: 'rocket-outline',
    },
    {
      id: 'express',
      group: 'Giao hàng Xe máy',
      label: 'Siêu Tốc',
      description: 'Ưu tiên tài xế gần điểm lấy',
      icon: 'flash-outline',
    },
    {
      id: '4h',
      group: 'Giao hàng Xe máy',
      label: '4H',
      description: 'Tối ưu chi phí trong ngày',
      icon: 'timer-outline',
    },
    {
      id: 'van500',
      group: 'Giao hàng Xe tải',
      label: 'Xe VAN 500kg',
      description: 'Hàng cồng kềnh nội thành',
      icon: 'bus-outline',
    },
    {
      id: 'pickup',
      group: 'Giao hàng Xe tải',
      label: 'Xe Bán Tải',
      description: 'Gọn cho hàng nặng vừa',
      icon: 'car-outline',
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const pickup = this.route.snapshot.queryParamMap.get('pickup');
    if (pickup) {
      this.pickupAddress = pickup;
    }
  }

  get selectedServiceFilterLabel(): string {
    if (this.serviceFilter === 'all') {
      return 'Chọn dịch vụ';
    }
    return this.serviceOptions.find((service) => service.id === this.serviceFilter)?.label ?? 'Chọn dịch vụ';
  }

  get filteredRows(): GmMultiStopRow[] {
    return this.rows.filter((row) => {
      const keyword = this.searchTerm.trim().toLowerCase();
      const matchesKeyword = !keyword || `${row.address} ${row.receiver} ${row.phone}`.toLowerCase().includes(keyword);
      const matchesService = this.serviceFilter === 'all' || row.serviceId === this.serviceFilter;
      const isValid = Boolean(row.address.trim() && row.receiver.trim() && row.phone.trim());
      const matchesStatus =
        this.dropoffFilter === 'all' || (this.dropoffFilter === 'valid' ? isValid : !isValid);
      return matchesKeyword && matchesService && matchesStatus;
    });
  }

  get validRows(): GmMultiStopRow[] {
    return this.rows.filter((row) => row.address.trim());
  }

  get totalFee(): number {
    return this.rows.length ? 22000 + Math.max(0, this.rows.length - 1) * 14000 : 0;
  }

  get originalFee(): number {
    return this.rows.length ? this.totalFee + 9000 : 0;
  }

  get routeDistanceKm(): string {
    return this.rows.length > 1 ? `${(3.37 + (this.rows.length - 1) * 1.8).toFixed(2)}km` : '3.37km';
  }

  addDropoff(): void {
    const service = this.serviceOptions[0];
    this.rows = [
      ...this.rows,
      {
        id: `row-${Date.now()}`,
        serviceId: service.id,
        service: service.label,
        icon: service.icon,
        address: '',
        receiver: '',
        phone: '',
        cod: 0,
        declaredValue: 0,
        weightKg: 0,
        lengthCm: 0,
        widthCm: 0,
        heightCm: 0,
        trackingCode: '',
      },
    ];
  }

  continue(): void {
    if (this.activeStep === 0 && !this.rows.length) {
      this.addDropoff();
      return;
    }
    this.activeStep = Math.min(this.activeStep + 1, this.steps.length - 1);
  }

  goBack(): void {
    if (this.activeStep > 0) {
      this.activeStep -= 1;
      return;
    }
    this.router.navigate(['/gap-move/booking/new'], { queryParams: { type: 'multi_stop', pickup: this.pickupAddress } });
  }

  createOrder(): void {
    this.router.navigate(['/gap-move/booking/confirm'], {
      queryParams: {
        type: 'multi_stop',
        pickup: this.pickupAddress,
        dropoffs: String(this.rows.length),
      },
    });
  }

  stepClass(index: number): string {
    if (index < this.activeStep) {
      return 'bg-[#ff5a00] text-white';
    }
    if (index === this.activeStep) {
      return 'bg-[#ff5a00] text-white ring-4 ring-orange-100';
    }
    return 'bg-slate-100 text-slate-800';
  }

  setDropoffFilter(filter: GmDropoffFilter): void {
    this.dropoffFilter = filter;
    this.isDropoffFilterOpen = false;
  }

  setServiceFilter(serviceId: string): void {
    this.serviceFilter = serviceId;
    this.isServiceFilterOpen = false;
  }

  toggleAddressMenu(row: GmMultiStopRow): void {
    this.addressMenuRowId = this.addressMenuRowId === row.id ? '' : row.id;
    this.serviceMenuRowId = '';
    this.rowMenuId = '';
  }

  toggleServiceMenu(row: GmMultiStopRow): void {
    this.serviceMenuRowId = this.serviceMenuRowId === row.id ? '' : row.id;
    this.addressMenuRowId = '';
    this.rowMenuId = '';
  }

  toggleRowMenu(row: GmMultiStopRow): void {
    this.rowMenuId = this.rowMenuId === row.id ? '' : row.id;
    this.addressMenuRowId = '';
    this.serviceMenuRowId = '';
  }

  chooseService(row: GmMultiStopRow, service: GmMultiStopService): void {
    row.serviceId = service.id;
    row.service = service.label;
    row.icon = service.icon;
    this.serviceMenuRowId = '';
  }

  useCurrentAddress(row: GmMultiStopRow): void {
    row.address = this.currentAddress.replace('Vị trí hiện tại ', '');
    this.addressMenuRowId = '';
  }

  chooseMapAddress(row: GmMultiStopRow): void {
    row.address = 'Ngõ 59 Đường Văn Tiến Dũng, Đình Quán, Phường Phú Diễn, Hà Nội';
    this.addressMenuRowId = '';
  }

  saveRow(): void {
    this.rowMenuId = '';
  }

  removeRow(row: GmMultiStopRow): void {
    this.rows = this.rows.filter((item) => item.id !== row.id);
    this.rowMenuId = '';
  }

  formatAmount(amount: number): string {
    return formatVnd(amount);
  }
}
