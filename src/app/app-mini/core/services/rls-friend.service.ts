import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { RLS_API } from '../constants/rls-config.constants';
import {
  RlsContactImportRequest,
  RlsFriendImportResult,
  RlsFriendSuggestion,
} from '../interfaces';
import { RlsApiService } from './rls-api.service';

@Injectable({ providedIn: 'root' })
export class RlsFriendService {
  private readonly api = inject(RlsApiService);

  getSuggestions(): Observable<RlsFriendSuggestion[]> {
    return this.api
      .get<unknown>(RLS_API.FRIEND_SUGGESTIONS)
      .pipe(map((res) => this.normalizeSuggestions(res)));
  }

  importContacts(
    request: RlsContactImportRequest,
  ): Observable<RlsFriendImportResult> {
    return this.api
      .post<unknown>(RLS_API.FRIEND_CONTACT_IMPORT, request)
      .pipe(map((res) => this.normalizeImportResult(res)));
  }

  sendFriendRequest(userId: number): Observable<unknown> {
    return this.api.post<unknown>(
      this.buildPath(RLS_API.FRIEND_REQUEST, userId),
      {},
    );
  }

  private normalizeImportResult(raw: unknown): RlsFriendImportResult {
    const obj = (raw ?? {}) as Record<string, unknown>;
    return {
      matchedCount: Number(
        obj['matched_count'] ?? obj['matchedCount'] ?? obj['matched'] ?? 0,
      ),
      invitedCount: Number(
        obj['invited_count'] ?? obj['invitedCount'] ?? obj['invited'] ?? 0,
      ),
      suggestions: this.normalizeSuggestions(
        obj['suggestions'] ?? obj['matches'] ?? [],
      ),
    };
  }

  private normalizeSuggestions(raw: unknown): RlsFriendSuggestion[] {
    const items = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as Record<string, unknown> | null)?.['suggestions'])
        ? ((raw as Record<string, unknown>)['suggestions'] as unknown[])
        : [];

    return items.map((item, index) => this.normalizeSuggestion(item, index));
  }

  private normalizeSuggestion(raw: unknown, index: number): RlsFriendSuggestion {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const displayName = String(
      obj['display_name'] ?? obj['displayName'] ?? obj['name'] ?? 'Bạn mới',
    );

    return {
      id: Number(obj['id'] ?? obj['user_id'] ?? obj['userId'] ?? index + 1),
      displayName,
      phone:
        (obj['phone'] as string) ??
        (obj['phone_number'] as string) ??
        (obj['phoneNumber'] as string) ??
        null,
      avatarUrl:
        (obj['avatar_url'] as string) ?? (obj['avatarUrl'] as string) ?? null,
      source: String(obj['source'] ?? 'contacts'),
      status: String(obj['status'] ?? 'suggested'),
      mutualCount: Number(
        obj['mutual_count'] ?? obj['mutualCount'] ?? obj['mutual'] ?? 0,
      ),
      postsCount: Number(
        obj['posts_count'] ?? obj['postsCount'] ?? obj['posts'] ?? 0,
      ),
      distanceLabel:
        (obj['distance_label'] as string) ??
        (obj['distanceLabel'] as string) ??
        null,
      lastActiveLabel:
        (obj['last_active_label'] as string) ??
        (obj['lastActiveLabel'] as string) ??
        null,
    };
  }

  private buildPath(template: string, id: number | string): string {
    return template.replace(':id', String(id));
  }
}
