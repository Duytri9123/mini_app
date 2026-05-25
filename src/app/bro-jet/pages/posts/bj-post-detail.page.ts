import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { BjArticleService } from '../../core/services/bj-article.service';
import { BjArticle } from '../../core/interfaces/article.interface';
import { getImageUrl, handleImageError } from 'src/environments/environment';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-bj-post-detail',
  templateUrl: './bj-post-detail.page.html',
  styleUrls: ['./bj-post-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
})
export class BjPostDetailPage implements OnInit {
  article: BjArticle | null = null;
  loading = true;
  error = false;

  readonly getImageUrl = getImageUrl;
  readonly handleImageError = handleImageError;

  constructor(
    private route: ActivatedRoute,
    private articleService: BjArticleService,
    private titleService: Title,
    private metaService: Meta,
  ) {}

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.loadArticle(slug);
    } else {
      this.error = true;
      this.loading = false;
    }
  }

  private loadArticle(slug: string) {
    this.articleService.getArticleBySlug(slug).subscribe({
      next: (res) => {
        this.article = res.data;
        this.loading = false;
        this.updateSeo(res.data);
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  private updateSeo(article: BjArticle) {
    this.titleService.setTitle(article.seo?.title || article.title);
    if (article.seo?.description) {
      this.metaService.updateTag({ name: 'description', content: article.seo.description });
    }
    if (article.seo?.og_image) {
      this.metaService.updateTag({ property: 'og:image', content: article.seo.og_image });
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
}
