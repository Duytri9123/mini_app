export interface BjArticleSeo {
  title: string;
  description: string;
  keywords: string | null;
  og_image: string | null;
}

export interface BjArticleCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sort_order?: number;
  created_at?: string;
  articles?: BjArticle[] | null;
}

export interface BjArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  thumbnail_url: string | null;
  sort_order: number;
  status: 'active' | 'inactive';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category: BjArticleCategory | null;
  seo: BjArticleSeo;
}

export interface BjArticlePaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  has_more: boolean;
}

export interface BjArticleListResponse {
  message: string;
  data: BjArticle[];
  meta: BjArticlePaginationMeta;
}

export interface BjArticleDetailResponse {
  message: string;
  data: BjArticle;
}

export interface BjArticleCategoryListResponse {
  message: string;
  data: BjArticleCategory[];
}

export interface BjArticleGroupedResponse {
  message: string;
  data: BjArticleCategory[];
}
