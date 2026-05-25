import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { BjArticleService } from '../../core/services/bj-article.service';
import { BjArticle, BjArticleCategory, BjArticlePaginationMeta } from '../../core/interfaces/article.interface';
import { getImageUrl, handleImageError } from 'src/environments/environment';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-bj-posts',
  templateUrl: './bj-posts.page.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
  ],
})
export class BjPostsPage implements OnInit {
  articles: BjArticle[] = [];
  categories: BjArticleCategory[] = [];
  meta: BjArticlePaginationMeta | null = null;

  loading = true;
  loadingMore = false;
  selectedCategoryId: number | null = null;
  searchQuery = '';

  readonly getImageUrl = getImageUrl;
  readonly handleImageError = handleImageError;

  private searchSubject = new Subject<string>();

  constructor(
    private articleService: BjArticleService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadArticles();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
    ).subscribe((query) => {
      this.searchQuery = query;
      this.resetAndLoad();
    });
  }

  loadCategories() {
    this.articleService.getCategories().subscribe({
      next: (res) => {
        this.categories = res.data;
      },
    });
  }

  loadArticles(page = 1) {
    if (page === 1) {
      this.loading = true;
    }

    this.articleService.getArticles({
      page,
      limit: 10,
      category_id: this.selectedCategoryId ?? undefined,
      q: this.searchQuery || undefined,
    }).subscribe({
      next: (res) => {
        if (page === 1) {
          this.articles = res.data;
        } else {
          this.articles = [...this.articles, ...res.data];
        }
        this.meta = res.meta;
        this.loading = false;
        this.loadingMore = false;
      },
      error: () => {
        this.loading = false;
        this.loadingMore = false;
      },
    });
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  selectCategory(categoryId: number | null) {
    this.selectedCategoryId = categoryId;
    this.resetAndLoad();
  }

  resetAndLoad() {
    this.articles = [];
    this.meta = null;
    this.loadArticles(1);
  }

  loadMore(event: any) {
    if (!this.meta || !this.meta.has_more) {
      event.target.complete();
      return;
    }
    this.loadingMore = true;
    const nextPage = this.meta.current_page + 1;
    this.articleService.getArticles({
      page: nextPage,
      limit: 10,
      category_id: this.selectedCategoryId ?? undefined,
      q: this.searchQuery || undefined,
    }).subscribe({
      next: (res) => {
        this.articles = [...this.articles, ...res.data];
        this.meta = res.meta;
        this.loadingMore = false;
        event.target.complete();
        if (!res.meta.has_more) {
          event.target.disabled = true;
        }
      },
      error: () => {
        this.loadingMore = false;
        event.target.complete();
      },
    });
  }

  viewDetail(article: BjArticle) {
    this.router.navigate(['/bro-jet/posts', article.slug]);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
