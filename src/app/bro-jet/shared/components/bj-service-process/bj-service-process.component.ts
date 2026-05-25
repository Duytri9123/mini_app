import { Component } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';

export interface ServiceStep {
  step: number;
  title: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-bj-service-process',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './bj-service-process.component.html',
})
export class BjServiceProcessComponent {
  steps: ServiceStep[] = [
    {
      step: 1,
      title: 'Mở ứng dụng',
      icon: 'qr_code_scanner',
      description: 'Khách hàng mở app và quét mã QR trên máy.',
    },
    {
      step: 2,
      title: 'Đưa xe vào vị trí',
      icon: 'directions_car',
      description: 'Đầu xe vào đúng vị trí đường kéo giới hạn.',
    },
    {
      step: 3,
      title: 'Xác nhận an toàn',
      icon: 'verified_user',
      description: 'Ứng dụng hiện cảnh báo hoàn thành các thao tác an toàn.',
    },
    {
      step: 4,
      title: 'Chọn dịch vụ',
      icon: 'tune',
      description: 'Chọn chế độ rửa xe phù hợp với nhu cầu.',
    },
    {
      step: 5,
      title: 'Thanh toán',
      icon: 'payments',
      description: 'Thanh toán qua thẻ hoặc ví điện tử.',
    },
    {
      step: 6,
      title: 'Máy hoạt động',
      icon: 'autorenew',
      description: 'Máy tiến hành rửa xe tự động.',
    },
    {
      step: 7,
      title: 'Hoàn tất',
      icon: 'check_circle',
      description: 'Hoàn tất quá trình rửa xe.',
    },
    {
      step: 8,
      title: 'Lái xe ra',
      icon: 'exit_to_app',
      description: 'Thông báo khách hàng lái ô tô rời khỏi máy rửa.',
    },
  ];
}
