export type GmSupportMessageSender = 'customer' | 'support';

export interface GmSupportMessage {
  id: string;
  sender: GmSupportMessageSender;
  body: string;
  createdAt: string;
}
