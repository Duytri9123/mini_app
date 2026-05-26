import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gm-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gm-faq.page.html',
})
export class GmFaqPage {
  faqs = [
    { question: 'GapMove ho tro dich vu nao?', answer: 'GapMove ho tro dat xe, giao hang nhanh va giao hang hen gio.' },
    { question: 'Toi co the thanh toan bang gi?', answer: 'Ban co the thanh toan bang tien mat, vi GapMove, VNPay hoac MoMo.' },
    { question: 'Lam sao theo doi don giao hang?', answer: 'Mo muc Chuyen di hoac Giao hang de xem trang thai theo thoi gian thuc.' },
  ];
}
