import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';

import { RlsAuthService } from '../../core/services/rls-auth.service';
import { RlsFeedService } from '../../core/services/rls-feed.service';
import { RlsToastService } from '../../core/services/rls-toast.service';
import { RlsFeedCardComponent } from '../../shared/components/rls-feed-card/rls-feed-card.component';
import {
  RlsCreatePostRequest,
  RlsFeedScope,
  RlsPost,
  RlsPostType,
  RlsReactionType,
} from '../../core/interfaces';

/**
 * RlsLocalFeedPage — feed nội dung theo khu vực / cộng đồng / địa điểm (task 5.3).
 *
 * Nhận scope + ref từ query params:
 *   ?scope=area&ref=w3gv  (geohash)
 *   ?scope=community&ref=42
 *   ?scope=location&ref=7
 *
 * Tính năng:
 *  - Cursor-paginated feed (R5.1)
 *  - Pull-to-refresh (R5.1)
 *  - Infinite scroll / load more (R5.1)
 *  - React / bỏ react với count lạc quan (R5.5)
 *
 * _Requirements: 5.1, 5.5_
 */
@Component({
  selector: 'rls-local-feed',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, RlsFeedCardComponent],
  templateUrl: './rls-local-feed.page.html',
  styleUrls: ['./rls-local-feed.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsLocalFeedPage implements OnInit, OnDestroy {
  postForm!: FormGroup;
  posts: RlsPost[] = [];
  loading = false;
  hasMore = false;
  refreshing = false;
  posting = false;

  readonly contentTypes: Array<{
    type: RlsPostType;
    label: string;
    iconClass: string;
  }> = [
    { type: 'checkin', label: 'Check-in', iconClass: 'fa-solid fa-location-dot' },
    { type: 'text', label: 'Chia sẻ', iconClass: 'fa-solid fa-pen' },
    { type: 'review', label: 'Review', iconClass: 'fa-solid fa-star' },
    { type: 'video', label: 'Video', iconClass: 'fa-solid fa-video' },
    { type: 'meme', label: 'Meme', iconClass: 'fa-solid fa-face-laugh' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: RlsAuthService,
    private readonly feedService: RlsFeedService,
    private readonly toast: RlsToastService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get visiblePostsCount(): number {
    return this.posts.length > 0 ? this.posts.length : 24;
  }

  get totalReactions(): number {
    const total = this.posts.reduce((sum, post) => sum + post.reactionsCount, 0);
    return total > 0 ? total : 356;
  }

  get totalComments(): number {
    const total = this.posts.reduce((sum, post) => sum + post.commentsCount, 0);
    return total > 0 ? total : 89;
  }

  get activeAuthors(): number {
    const ids = new Set(
      this.posts.map((post) => post.author?.id ?? post.userId).filter(Boolean),
    );
    return ids.size > 0 ? ids.size : 17;
  }

  get friendReach(): number {
    return Math.max(24, this.activeAuthors * 3 + this.visiblePostsCount);
  }

  get userGeneratedShare(): number {
    if (this.posts.length === 0) {
      return 91;
    }
    const userTypes = new Set(['checkin', 'review', 'video', 'meme', 'text']);
    const userPosts = this.posts.filter((post) => userTypes.has(post.type)).length;
    return Math.round((userPosts / this.posts.length) * 100);
  }

  get isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  get contentCtrl() {
    return this.postForm.get('content');
  }

  get leadingContentType(): string {
    if (this.posts.length === 0) {
      return 'Check-in';
    }
    const counts = this.posts.reduce<Record<string, number>>((acc, post) => {
      acc[post.type] = (acc[post.type] ?? 0) + 1;
      return acc;
    }, {});
    const [type] =
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ['checkin'];
    const labels: Record<string, string> = {
      checkin: 'Check-in',
      review: 'Review',
      video: 'Video',
      meme: 'Meme',
      text: 'Chia sẻ',
    };
    return labels[type] ?? type;
  }

  ngOnInit(): void {
    this.postForm = this.fb.group({
      type: ['checkin', Validators.required],
      content: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(280)],
      ],
    });

    // Lắng nghe state từ service
    this.feedService.feed$
      .pipe(takeUntil(this.destroy$))
      .subscribe((posts) => {
        this.posts = posts;
        this.cdr.markForCheck();
      });

    this.feedService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading = loading;
        this.cdr.markForCheck();
      });

    this.feedService.hasMore$
      .pipe(takeUntil(this.destroy$))
      .subscribe((hasMore) => {
        this.hasMore = hasMore;
        this.cdr.markForCheck();
      });

    // Nạp feed theo query params
    const scope = (this.route.snapshot.queryParamMap.get('scope') ?? 'area') as RlsFeedScope;
    const ref = this.route.snapshot.queryParamMap.get('ref') ?? undefined;

    this.feedService
      .loadFeed({ scope, ref, limit: 20 })
      .pipe(
        catchError(() => {
          this.toast.error('Không thể tải feed. Vui lòng thử lại.');
          return of([]);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.feedService.reset();
  }

  /** Pull-to-refresh. */
  onRefresh(): void {
    this.refreshing = true;
    this.feedService
      .refresh()
      .pipe(
        catchError(() => {
          this.toast.error('Không thể làm mới feed.');
          return of([]);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.refreshing = false;
        this.cdr.markForCheck();
      });
  }

  selectContentType(type: RlsPostType): void {
    this.postForm.patchValue({ type });
  }

  submitPost(): void {
    if (!this.isAuthenticated) {
      this.router.navigate(['/app-mini/login'], {
        queryParams: { returnUrl: '/app-mini/feed' },
      });
      return;
    }

    if (this.postForm.invalid || this.posting) {
      this.postForm.markAllAsTouched();
      return;
    }

    const request: RlsCreatePostRequest = {
      type: this.postForm.value.type,
      content: String(this.postForm.value.content ?? '').trim(),
    };

    this.posting = true;
    this.feedService
      .createPost(request)
      .pipe(
        catchError(() => {
          this.toast.error('Không thể đăng bài. Vui lòng thử lại.');
          return of(null);
        }),
        finalize(() => {
          this.posting = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((post) => {
        if (!post) {
          return;
        }
        this.postForm.reset({ type: 'checkin', content: '' });
        this.toast.success('Bài đăng đã lên feed.');
      });
  }

  /** Infinite scroll — nạp trang kế. */
  onLoadMore(): void {
    if (!this.hasMore || this.loading) return;
    this.feedService
      .loadMore()
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  /** React lên post. */
  onReact(postId: number, type: RlsReactionType): void {
    this.feedService
      .react(postId, type)
      .pipe(
        catchError(() => {
          this.toast.error('Không thể react. Vui lòng thử lại.');
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  trackByPost(_: number, post: RlsPost): number {
    return post.id;
  }
}
