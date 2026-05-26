import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gm-qr',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gm-qr.page.html',
})
export class GmQrPage {
  qrPayload = 'GAPMOVE:CUSTOMER:user-1';
}
