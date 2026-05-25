import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BjApiService } from './bj-api.service';
import {
  BjArticleListResponse,
  BjArticleDetailResponse,
  BjArticleCategoryListResponse,
} from '../interfaces/article.interface';

export interface BjArticleListParams {
  page?: number;
  limit?: number;
  category_id?: number;
  q?: string;
}

@Injectable({ providedIn: 'root' })
export class BjArticleService {
  constructor(private api: BjApiService) {}

  getArticles(params?: BjArticleListParams): Observable<BjArticleListResponse> {
    const queryParts: string[] = [];
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    if (params?.category_id) queryParts.push(`category_id=${params.category_id}`);
    if (params?.q) queryParts.push(`q=${encodeURIComponent(params.q)}`);

    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.api.get(`articles${query}`) as Observable<BjArticleListResponse>;
  }

  getArticleBySlug(slug: string): Observable<BjArticleDetailResponse> {
    return this.api.get(`articles/${slug}`) as Observable<BjArticleDetailResponse>;
  }

  getCategories(): Observable<BjArticleCategoryListResponse> {
    return this.api.get('articles/categories') as Observable<BjArticleCategoryListResponse>;
  }
}
