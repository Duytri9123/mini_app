import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

interface GmSettingsLink {
  label: string;
  description: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-gm-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonicModule],
  templateUrl: './gm-settings.page.html',
})
export class GmSettingsPage {
  notificationSettings = {
    bookingUpdates: true,
    deliveryProofs: true,
    promotions: false,
    driverChat: true,
  };

  servicePreferences = {
    autoInsurance: false,
    preferVerifiedDrivers: true,
    requireDeliveryPhoto: true,
    defaultPorter: false,
  };

  accountLinks: GmSettingsLink[] = [
    {
      label: 'Hồ sơ cá nhân',
      description: 'Tên, số điện thoại, email, avatar',
      icon: 'person-outline',
      route: '/gap-move/profile',
    },
    {
      label: 'Địa chỉ đã lưu',
      description: 'Nhà, công ty, kho, cửa hàng',
      icon: 'location-outline',
      route: '/gap-move/saved-addresses',
    },
    {
      label: 'Phương tiện',
      description: 'Xe cá nhân và phương tiện thường dùng',
      icon: 'car-outline',
      route: '/gap-move/vehicles',
    },
  ];

  paymentLinks: GmSettingsLink[] = [
    {
      label: 'Ví GapMove',
      description: 'Số dư, giao dịch, nạp tiền',
      icon: 'wallet-outline',
      route: '/gap-move/wallet',
    },
    {
      label: 'Mã ưu đãi',
      description: 'Coupon, điểm thưởng, chương trình khách hàng',
      icon: 'gift-outline',
      route: '/gap-move/rewards',
    },
    {
      label: 'Hóa đơn doanh nghiệp',
      description: 'Thông tin xuất hóa đơn và đối soát',
      icon: 'business-outline',
      route: '/gap-move/business',
    },
  ];

  supportLinks: GmSettingsLink[] = [
    {
      label: 'Trung tâm hỗ trợ',
      description: 'Chat với GapMove, khiếu nại, báo sự cố',
      icon: 'chatbubbles-outline',
      route: '/gap-move/support-chat',
    },
    {
      label: 'FAQ',
      description: 'Câu hỏi thường gặp về đặt xe, giao hàng, bê hộ',
      icon: 'help-circle-outline',
      route: '/gap-move/faq',
    },
    {
      label: 'Điều khoản & chính sách',
      description: 'Điều khoản dịch vụ, bảo mật và bồi thường',
      icon: 'shield-checkmark-outline',
      route: '/gap-move/policy',
    },
  ];
}
