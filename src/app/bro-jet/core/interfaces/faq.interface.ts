export interface BjFaqItem {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  sort_order: number;
  status: string;
  created_at?: string;
}

export interface BjFaqCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
  status: string;
  faqs: BjFaqItem[];
}

export interface BjFaqResponse {
  message: string;
  data: BjFaqCategory[];
}
