import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GmSupportMessage } from '../interfaces/support-chat.interface';
import { createId } from '../utils/helpers';

@Injectable({ providedIn: 'root' })
export class GmSupportChatService {
  private readonly messages$ = new BehaviorSubject<GmSupportMessage[]>([
    {
      id: 'support-1',
      sender: 'support',
      body: 'GapMove co the ho tro van de dat xe hoac giao hang nao?',
      createdAt: new Date().toISOString(),
    },
  ]);

  getMessages() {
    return this.messages$.asObservable();
  }

  sendMessage(body: string): void {
    const message: GmSupportMessage = {
      id: createId('msg'),
      sender: 'customer',
      body,
      createdAt: new Date().toISOString(),
    };

    this.messages$.next([...this.messages$.getValue(), message]);
  }
}
