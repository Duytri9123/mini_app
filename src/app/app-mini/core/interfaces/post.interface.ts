/**
 * REALTIME LOCAL SOCIAL (app-mini) — Post / Feed interfaces.
 *
 * Ánh xạ model `POSTS` + `COMMENTS` + `REACTIONS` (design.md §5.1) và
 * feed cursor (`GET /feed`, design.md §6.4). Sự kiện realtime `NewFeedItem`
 * (design.md §7.1) có interface riêng trong `event.interface.ts`.
 */

/** Loại nội dung post (design.md §5.1 POSTS.type / §6.4). */
export type RlsPostType = 'checkin' | 'review' | 'video' | 'meme' | 'text';

/** Trạng thái kiểm duyệt (design.md §5.1 POSTS.status). */
export type RlsPostStatus = 'active' | 'hidden' | 'removed';

/** Loại reaction (design.md §5.1 REACTIONS.type). */
export type RlsReactionType = 'like' | 'love' | 'fire' | 'wow';

/** Scope của local feed (design.md §6.4 `GET /feed?scope=`). */
export type RlsFeedScope = 'area' | 'community' | 'location';

/** Tác giả tối giản hiển thị trên card feed. */
export interface RlsPostAuthor {
  id: number;
  displayName: string;
  avatarUrl?: string | null;
}

/** Một bài đăng trong local feed. */
export interface RlsPost {
  id: number;
  userId: number;
  author?: RlsPostAuthor;
  locationId?: number | null;
  communityId?: number | null;
  type: RlsPostType;
  content: string;
  media?: string[]; // urls
  lat?: number;
  lng?: number;
  geohash6?: string;
  status: RlsPostStatus | string;
  reactionsCount: number;
  commentsCount: number;
  /** Reaction của user hiện tại (nếu có) — phục vụ render reaction bar. */
  myReaction?: RlsReactionType | null;
  createdAt: string; // ISO8601
  updatedAt?: string;
}

/** Reaction trên một target (polymorphic: post/story/comment). */
export interface RlsReaction {
  id: number;
  userId: number;
  reactableType: 'post' | 'story' | 'comment';
  reactableId: number;
  type: RlsReactionType;
  createdAt: string;
}

/** Comment (hỗ trợ threading qua parentId). */
export interface RlsComment {
  id: number;
  userId: number;
  author?: RlsPostAuthor;
  postId: number;
  parentId?: number | null;
  content: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Tham số truy vấn feed (cursor pagination). */
export interface RlsFeedQuery {
  scope: RlsFeedScope;
  ref?: string | number; // geohash | communityId | locationId tùy scope
  cursor?: string | null;
  limit?: number;
}

/** Payload tạo post mới. */
export interface RlsCreatePostRequest {
  type: RlsPostType;
  content: string;
  locationId?: number | null;
  communityId?: number | null;
  lat?: number;
  lng?: number;
  media?: string[];
}
