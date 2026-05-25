import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IonContent } from '@ionic/angular/standalone';
import Pusher, { Channel } from 'pusher-js';
import { BASE_URL, getImageUrl, handleImageError } from 'src/environments/environment';
import {
  BjSupportChatAttachment,
  BjSupportChatConversation,
  BjSupportChatMessage,
  BjSupportChatRealtimeConfig,
} from '../../core/interfaces/support-chat.interface';
import { BjAuthService } from '../../core/services/bj-auth.service';
import { BjSupportChatService } from '../../core/services/bj-support-chat.service';

@Component({
  selector: 'app-bj-support-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  templateUrl: './bj-support-chat.page.html',
})
export class BjSupportChatPage implements OnInit, OnDestroy {
  @ViewChild('supportFileInput')
  supportFileInput?: ElementRef<HTMLInputElement>;

  draftMessage = '';
  errorMessage = '';
  infoMessage = '';
  isLoading = true;
  isSending = false;

  conversation: BjSupportChatConversation | null = null;
  messages: BjSupportChatMessage[] = [];
  selectedFiles: File[] = [];
  previewImageUrl: string | null = null;
  previewImageName = '';

  private readonly maxFiles = 5;
  private readonly maxFileSizeBytes = 20 * 1024 * 1024;
  private readonly subscriptions = new Subscription();
  private readonly renderedMessageIds = new Set<string>();

  private pusher: Pusher | null = null;
  private realtimeChannel: Channel | null = null;

  constructor(
    private readonly authService: BjAuthService,
    private readonly supportChatService: BjSupportChatService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      void this.router.navigate(['/bro-jet/login']);
      return;
    }

    this.loadChatThread();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.teardownRealtime();
  }

  get canSend(): boolean {
    return !this.isSending && (this.draftMessage.trim() !== '' || this.selectedFiles.length > 0);
  }

  get fileLimitNote(): string {
    return `Tối đa ${this.maxFiles} tệp, mỗi tệp dưới 20MB`;
  }

  openFilePicker(): void {
    this.supportFileInput?.nativeElement.click();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const pickedFiles = Array.from(input?.files ?? []);

    this.errorMessage = '';

    for (const file of pickedFiles) {
      if (this.selectedFiles.length >= this.maxFiles) {
        this.errorMessage = `Chỉ được gửi tối đa ${this.maxFiles} tệp mỗi lần.`;
        continue;
      }

      if (file.size > this.maxFileSizeBytes) {
        this.errorMessage = `Tệp ${file.name} vượt quá 20MB.`;
        continue;
      }

      this.selectedFiles = [...this.selectedFiles, file];
    }

    if (input) {
      input.value = '';
    }
  }

  removeSelectedFile(index: number): void {
    if (index < 0 || index >= this.selectedFiles.length) {
      return;
    }

    const next = [...this.selectedFiles];
    next.splice(index, 1);
    this.selectedFiles = next;
  }

  sendMessage(): void {
    const content = this.draftMessage.trim();

    if (content === '' && this.selectedFiles.length === 0) {
      return;
    }

    this.isSending = true;
    this.errorMessage = '';
    const files = [...this.selectedFiles];

    const sendSub = this.supportChatService.sendMessage(content, files).subscribe({
      next: (response) => {
        const latestConversation = response.data?.conversation ?? null;
        const latestMessage = response.data?.message ?? null;

        if (latestConversation) {
          this.conversation = latestConversation;
        }

        if (latestMessage) {
          this.appendMessage(latestMessage, true);
        }

        this.infoMessage = response.message ?? 'Đã gửi tin nhắn.';
        this.draftMessage = '';
        this.selectedFiles = [];
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Không gửi được tin nhắn. Vui lòng thử lại.');
      },
      complete: () => {
        this.isSending = false;
      },
    });

    this.subscriptions.add(sendSub);
  }

  trackByMessage(_index: number, message: BjSupportChatMessage): string {
    return message.id;
  }

  trackByAttachment(_index: number, attachment: BjSupportChatAttachment): string {
    return attachment.id;
  }

  private loadChatThread(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.infoMessage = '';

    const threadSub = this.supportChatService.getThread().subscribe({
      next: (response) => {
        const payload = response.data;
        this.conversation = payload?.conversation ?? null;
        this.messages = (payload?.messages ?? []).map((message) => this.normalizeMessage(message));

        this.renderedMessageIds.clear();
        this.messages.forEach((message) => {
          this.renderedMessageIds.add(message.id);
        });

        this.initRealtime(payload?.realtime ?? null, this.conversation?.id ?? '');
        this.isLoading = false;
        this.scrollToBottomSoon();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = this.extractErrorMessage(error, 'Không tải được hội thoại hỗ trợ.');

        if (error?.status === 401) {
          void this.router.navigate(['/bro-jet/login']);
        }
      },
    });

    this.subscriptions.add(threadSub);
  }

  private appendMessage(message: BjSupportChatMessage, scrollAfterAppend: boolean): void {
    const normalizedMessage = this.normalizeMessage(message);

    if (!normalizedMessage?.id || this.renderedMessageIds.has(normalizedMessage.id)) {
      return;
    }

    this.renderedMessageIds.add(normalizedMessage.id);
    this.messages = [...this.messages, normalizedMessage];

    if (scrollAfterAppend) {
      this.scrollToBottomSoon();
    }
  }

  private initRealtime(config: BjSupportChatRealtimeConfig | null, conversationId: string): void {
    this.teardownRealtime();

    if (!config?.enabled || !config.key || conversationId === '') {
      return;
    }

    const token = this.authService.getAccessToken();

    if (!token) {
      return;
    }

    const authEndpoint = (config.auth_endpoint ?? `${BASE_URL}/api/broadcasting/auth`).trim();
    const channelName = (config.channel_name ?? `private-support.conversation.${conversationId}`).trim();
    const eventName = (config.event_name ?? 'support.message.sent').trim();

    if (authEndpoint === '' || channelName === '' || eventName === '') {
      return;
    }

    this.pusher = new Pusher(config.key, {
      cluster: config.cluster ?? 'ap1',
      forceTLS: true,
      authEndpoint,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });

    this.realtimeChannel = this.pusher.subscribe(channelName);
    this.realtimeChannel.bind(eventName, (payload: { message?: BjSupportChatMessage }) => {
      const incomingMessage = payload?.message;

      if (!incomingMessage) {
        return;
      }

      this.appendMessage(incomingMessage, true);
    });
  }

  openImagePreview(attachment: BjSupportChatAttachment): void {
    const imageUrl = this.resolveMediaUrl(attachment?.url ?? '');

    if (imageUrl === '') {
      return;
    }

    this.previewImageUrl = imageUrl;
    this.previewImageName = attachment?.name ?? 'Hình ảnh đính kèm';
  }

  openAttachment(attachment: BjSupportChatAttachment): void {
    if (this.isImageAttachment(attachment)) {
      this.openImagePreview(attachment);
      return;
    }

    const fileUrl = this.resolveMediaUrl(attachment?.url ?? '');

    if (fileUrl !== '') {
      window.open(fileUrl, '_blank', 'noopener');
    }
  }

  isImageAttachment(attachment: BjSupportChatAttachment): boolean {
    const mimeType = String(attachment?.mime_type ?? '').toLowerCase();

    if (mimeType.startsWith('image/')) {
      return true;
    }

    const fileName = String(attachment?.name ?? '').toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].some((extension) => fileName.endsWith(extension));
  }

  closeImagePreview(): void {
    this.previewImageUrl = null;
    this.previewImageName = '';
  }

  onImageError(event: Event): void {
    handleImageError(event);
  }

  resolveMediaUrl(path: string | null | undefined): string {
    const value = String(path ?? '').trim();

    if (value === '') {
      return '';
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    if (value.startsWith('/')) {
      return `${BASE_URL}${value}`;
    }

    return getImageUrl(value);
  }

  private normalizeMessage(message: BjSupportChatMessage): BjSupportChatMessage {
    return {
      ...message,
      sender_avatar_url: this.resolveMediaUrl(message?.sender_avatar_url ?? null) || null,
      attachments: Array.isArray(message?.attachments)
        ? message.attachments.map((attachment) => ({
            ...attachment,
            url: this.resolveMediaUrl(attachment?.url ?? ''),
          }))
        : [],
    };
  }

  private teardownRealtime(): void {
    if (this.realtimeChannel && this.pusher) {
      this.realtimeChannel.unbind_all();
      this.pusher.unsubscribe(this.realtimeChannel.name);
    }

    if (this.pusher) {
      this.pusher.disconnect();
    }

    this.realtimeChannel = null;
    this.pusher = null;
  }

  private scrollToBottomSoon(): void {
    window.setTimeout(() => {
      const container = document.getElementById('support-chat-message-list');

      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const apiError = (error ?? {}) as {
      message?: string;
      error?: {
        message?: string;
        errors?: Record<string, string[] | string>;
      };
    };

    const validationBag = apiError.error?.errors;

    if (validationBag) {
      const first = Object.values(validationBag).flat()[0];

      if (typeof first === 'string' && first.trim() !== '') {
        return first;
      }
    }

    const directMessage = apiError.error?.message ?? apiError.message;

    if (typeof directMessage === 'string' && directMessage.trim() !== '') {
      return directMessage;
    }

    return fallback;
  }

  formatFileSize(sizeBytes: number): string {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB'];
    let size = sizeBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }
}
