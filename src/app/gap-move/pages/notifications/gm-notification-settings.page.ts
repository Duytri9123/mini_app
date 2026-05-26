import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-gm-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gm-notification-settings.page.html',
})
export class GmNotificationSettingsPage {
  booking = true;
  delivery = true;
  promotion = false;
}
