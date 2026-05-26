import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GmSupportChatService } from '../../core/services/gm-support-chat.service';

@Component({
  selector: 'app-gm-support-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gm-support-chat.page.html',
})
export class GmSupportChatPage {
  messages$ = this.supportChatService.getMessages();
  message = '';

  constructor(private supportChatService: GmSupportChatService) {}

  send(): void {
    const body = this.message.trim();
    if (!body) {
      return;
    }

    this.supportChatService.sendMessage(body);
    this.message = '';
  }
}
