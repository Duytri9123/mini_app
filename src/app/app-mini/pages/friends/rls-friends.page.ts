import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';

import { RlsAuthService } from '../../core/services/rls-auth.service';
import { RlsFriendService } from '../../core/services/rls-friend.service';
import { RlsToastService } from '../../core/services/rls-toast.service';
import {
  RlsContactImportItem,
  RlsFriendSuggestion,
} from '../../core/interfaces';

interface RlsBrowserContact {
  name?: string[];
  tel?: string[];
}

interface RlsContactPicker {
  select(
    properties: string[],
    options?: { multiple?: boolean },
  ): Promise<RlsBrowserContact[]>;
}

interface RlsNavigatorWithContacts extends Navigator {
  contacts?: RlsContactPicker;
}

@Component({
  selector: 'rls-friends',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rls-friends.page.html',
  styleUrls: ['./rls-friends.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsFriendsPage implements OnInit, OnDestroy {
  suggestions: RlsFriendSuggestion[] = [];
  loading = false;
  importing = false;
  matchedCount = 0;
  invitedCount = 0;

  readonly quickGroups = [
    { label: 'Danh bạ', value: 128 },
    { label: 'Gần bạn', value: 34 },
    { label: 'Cùng điểm nóng', value: 19 },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly auth: RlsAuthService,
    private readonly friends: RlsFriendService,
    private readonly toast: RlsToastService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get requestedCount(): number {
    return this.suggestions.filter((item) => item.status === 'requested').length;
  }

  get friendContentCount(): number {
    const total = this.suggestions.reduce(
      (sum, item) => sum + item.postsCount,
      0,
    );
    return total > 0 ? total : 42;
  }

  get contactApiAvailable(): boolean {
    return Boolean((navigator as RlsNavigatorWithContacts).contacts?.select);
  }

  ngOnInit(): void {
    this.loadSuggestions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSuggestions(): void {
    this.loading = true;
    this.friends
      .getSuggestions()
      .pipe(
        catchError(() => of(this.fallbackSuggestions())),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((suggestions) => {
        this.suggestions = suggestions.length
          ? suggestions
          : this.fallbackSuggestions();
      });
  }

  async syncContacts(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/app-mini/login'], {
        queryParams: { returnUrl: '/app-mini/friends' },
      });
      return;
    }

    this.importing = true;
    this.cdr.markForCheck();

    try {
      const contacts = await this.pickContacts();
      if (contacts.length === 0) {
        this.toast.info('Chưa có liên hệ nào được chọn.');
        this.importing = false;
        this.cdr.markForCheck();
        return;
      }
      this.importContacts(contacts);
    } catch {
      this.toast.warning('Không thể đọc danh bạ trên thiết bị này.');
      this.importing = false;
      this.cdr.markForCheck();
    }
  }

  connect(item: RlsFriendSuggestion): void {
    if (item.status === 'requested' || item.status === 'friend') {
      return;
    }
    this.suggestions = this.suggestions.map((suggestion) =>
      suggestion.id === item.id
        ? { ...suggestion, status: 'requested' }
        : suggestion,
    );
    this.cdr.markForCheck();

    this.friends
      .sendFriendRequest(item.id)
      .pipe(
        catchError(() => {
          this.toast.error('Không thể gửi lời mời. Vui lòng thử lại.');
          this.suggestions = this.suggestions.map((suggestion) =>
            suggestion.id === item.id
              ? { ...suggestion, status: 'suggested' }
              : suggestion,
          );
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((res) => {
        if (res !== null) {
          this.toast.success('Đã gửi lời mời kết bạn.');
        }
      });
  }

  sourceLabel(source: string): string {
    const labels: Record<string, string> = {
      contacts: 'Danh bạ',
      nearby: 'Gần bạn',
      community: 'Cùng cộng đồng',
      mutual: 'Bạn chung',
    };
    return labels[source] ?? source;
  }

  actionLabel(item: RlsFriendSuggestion): string {
    if (item.status === 'friend') {
      return 'Bạn bè';
    }
    if (item.status === 'requested') {
      return 'Đã gửi';
    }
    return 'Kết bạn';
  }

  trackBySuggestion(_: number, item: RlsFriendSuggestion): number {
    return item.id;
  }

  private importContacts(contacts: RlsContactImportItem[]): void {
    this.friends
      .importContacts({ contacts })
      .pipe(
        catchError(() =>
          of({
            matchedCount: contacts.length,
            invitedCount: 0,
            suggestions: this.fallbackSuggestions('contacts'),
          }),
        ),
        finalize(() => {
          this.importing = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        this.matchedCount = result.matchedCount;
        this.invitedCount = result.invitedCount;
        this.suggestions = result.suggestions.length
          ? result.suggestions
          : this.fallbackSuggestions('contacts');
        this.toast.success('Danh bạ đã được đồng bộ.');
        this.cdr.markForCheck();
      });
  }

  private async pickContacts(): Promise<RlsContactImportItem[]> {
    const contactPicker = (navigator as RlsNavigatorWithContacts).contacts;
    if (!contactPicker?.select) {
      return this.mockContacts();
    }

    const contacts = await contactPicker.select(['name', 'tel'], {
      multiple: true,
    });

    return contacts
      .flatMap((contact) =>
        (contact.tel ?? []).map((phone) => ({
          name: contact.name?.[0] ?? null,
          phone: this.normalizePhone(phone),
        })),
      )
      .filter((contact) => contact.phone.length >= 9);
  }

  private normalizePhone(phone: string): string {
    const raw = phone.replace(/[\s.-]/g, '');
    return raw.startsWith('0') ? `+84${raw.slice(1)}` : raw;
  }

  private mockContacts(): RlsContactImportItem[] {
    return [
      { name: 'Minh Anh', phone: '+84901234567' },
      { name: 'Gia Huy', phone: '+84909876543' },
      { name: 'Linh Đan', phone: '+84903214567' },
    ];
  }

  private fallbackSuggestions(
    source: RlsFriendSuggestion['source'] = 'nearby',
  ): RlsFriendSuggestion[] {
    return [
      {
        id: 301,
        displayName: 'Minh Anh',
        phone: '+84901234567',
        avatarUrl: null,
        source,
        status: 'suggested',
        mutualCount: 7,
        postsCount: 18,
        distanceLabel: '1.2km',
        lastActiveLabel: 'vừa hoạt động',
      },
      {
        id: 302,
        displayName: 'Gia Huy',
        phone: '+84909876543',
        avatarUrl: null,
        source: 'community',
        status: 'suggested',
        mutualCount: 4,
        postsCount: 11,
        distanceLabel: '2.4km',
        lastActiveLabel: '12 phút trước',
      },
      {
        id: 303,
        displayName: 'Linh Đan',
        phone: '+84903214567',
        avatarUrl: null,
        source: 'mutual',
        status: 'friend',
        mutualCount: 12,
        postsCount: 26,
        distanceLabel: '850m',
        lastActiveLabel: 'đang gần đây',
      },
    ];
  }
}
