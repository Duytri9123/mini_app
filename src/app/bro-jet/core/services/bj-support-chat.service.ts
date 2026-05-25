import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BjApiService } from './bj-api.service';
import {
  BjSupportChatBootstrapResponse,
  BjSupportChatSendResponse,
} from '../interfaces/support-chat.interface';

@Injectable({ providedIn: 'root' })
export class BjSupportChatService {
  constructor(private readonly api: BjApiService) {}

  getThread(): Observable<BjSupportChatBootstrapResponse> {
    return this.api.get('bj/support-chat') as Observable<BjSupportChatBootstrapResponse>;
  }

  sendMessage(content: string, files: File[]): Observable<BjSupportChatSendResponse> {
    const formData = new FormData();
    const trimmedContent = content.trim();

    if (trimmedContent !== '') {
      formData.append('content', trimmedContent);
    }

    files.forEach((file) => {
      formData.append('files[]', file);
    });

    return this.api.post('bj/support-chat/messages', formData) as Observable<BjSupportChatSendResponse>;
  }
}
