export interface BjSupportChatAttachment {
  id: string;
  name: string;
  url: string;
  mime_type: string;
  size_bytes: number;
}

export interface BjSupportChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_is_admin: boolean;
  sender_avatar_url?: string | null;
  content: string;
  created_at?: string | null;
  read_at?: string | null;
  is_read?: boolean;
  time: string;
  attachments: BjSupportChatAttachment[];
}

export interface BjSupportChatParticipant {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface BjSupportChatConversation {
  id: string;
  status: 'open' | 'closed' | string;
  last_message_at?: string | null;
  customer: BjSupportChatParticipant;
  assigned_admin: BjSupportChatParticipant;
}

export interface BjSupportChatRealtimeConfig {
  enabled: boolean;
  key?: string | null;
  cluster?: string | null;
  auth_endpoint?: string | null;
  channel_name?: string | null;
  event_name?: string | null;
}

export interface BjSupportChatBootstrapData {
  conversation: BjSupportChatConversation;
  messages: BjSupportChatMessage[];
  limits?: {
    max_files?: number;
    max_file_size_mb?: number;
  };
  realtime?: BjSupportChatRealtimeConfig;
}

export interface BjSupportChatBootstrapResponse {
  message?: string;
  data?: BjSupportChatBootstrapData;
}

export interface BjSupportChatSendResponse {
  message?: string;
  data?: {
    conversation?: BjSupportChatConversation;
    message?: BjSupportChatMessage;
  };
}
