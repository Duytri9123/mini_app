import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gm-business',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gm-business.page.html',
})
export class GmBusinessPage {
  features = [
    'Quản lý nhiều nhân viên đặt đơn',
    'Đối soát ví doanh nghiệp theo tháng',
    'Lưu mẫu tuyến giao hàng thường xuyên',
    'Xuất hóa đơn và báo cáo chi phí',
  ];
}
