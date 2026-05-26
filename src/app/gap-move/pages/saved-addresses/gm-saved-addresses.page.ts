import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gm-saved-addresses',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gm-saved-addresses.page.html',
})
export class GmSavedAddressesPage {
  addresses = [
    { label: 'Nhà', address: 'Ben Thanh, Quận 1, TP.HCM', note: 'Điểm đón mặc định' },
    { label: 'Công ty', address: 'Thảo Điền, TP. Thủ Đức', note: 'Có bảo vệ nhận hàng' },
    { label: 'Kho hàng', address: 'Tân Bình, TP.HCM', note: 'Ưu tiên xe van và xe tải' },
  ];
}
