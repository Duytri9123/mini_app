export type RlsFriendSource = 'contacts' | 'nearby' | 'community' | 'mutual';

export type RlsFriendStatus = 'suggested' | 'requested' | 'friend';

export interface RlsContactImportItem {
  name?: string | null;
  phone: string;
}

export interface RlsContactImportRequest {
  contacts: RlsContactImportItem[];
}

export interface RlsFriendSuggestion {
  id: number;
  displayName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  source: RlsFriendSource | string;
  status: RlsFriendStatus | string;
  mutualCount: number;
  postsCount: number;
  distanceLabel?: string | null;
  lastActiveLabel?: string | null;
}

export interface RlsFriendImportResult {
  matchedCount: number;
  invitedCount: number;
  suggestions: RlsFriendSuggestion[];
}
