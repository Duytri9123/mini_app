import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gm-rewards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gm-rewards.page.html',
})
export class GmRewardsPage {
  vouchers = [
    { code: 'GAP10', title: 'Giảm 10.000đ', description: 'Áp dụng cho đặt xe và giao hàng từ 50.000đ' },
    { code: 'PORTER20', title: 'Giảm 20.000đ bê hộ', description: 'Áp dụng khi chọn ít nhất 2 người bê hàng' },
    { code: 'TRUCK50', title: 'Giảm 50.000đ xe tải', description: 'Áp dụng cho đơn xe tải/chuyển nhà mini' },
  ];
}
