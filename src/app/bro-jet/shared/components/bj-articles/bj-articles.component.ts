import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BjArticleService } from '../../../core/services/bj-article.service';
import { BjArticle } from '../../../core/interfaces/article.interface';
import { getImageUrl, handleImageError } from 'src/environments/environment';

@Component({
  selector: 'app-bj-articles',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-articles.component.html',
})
export class BjArticlesComponent implements OnInit {
  articles: BjArticle[] = [];
  loading = true;

  readonly getImageUrl = getImageUrl;
  readonly handleImageError = handleImageError;

  constructor(
    private articleService: BjArticleService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.articleService.getArticles({ limit: 5 }).subscribe({
      next: (res) => {
        this.articles = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  viewAll() {
    this.router.navigate(['/bro-jet/posts']);
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
