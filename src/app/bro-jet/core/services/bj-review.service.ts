import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BjApiService } from './bj-api.service';

export interface StationReviewItem {
  id: string;
  stationId: string;
  stationName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PaginatedStationReviewResponse {
  data: StationReviewItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

export interface DeleteStationReviewResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class BjReviewService {
  constructor(private api: BjApiService) {}

  getReviews(stationId?: string, page: number = 1, perPage: number = 10): Observable<PaginatedStationReviewResponse> {
    let url = `station-reviews?page=${page}&per_page=${perPage}`;
    if (stationId) {
      url += `&station_id=${stationId}`;
    }
    return this.api.get(url) as Observable<PaginatedStationReviewResponse>;
  }

  createReview(stationId: string, rating: number, comment: string): Observable<StationReviewItem> {
    return this.api.post('station-reviews', {
      station_id: stationId,
      rating,
      comment
    }) as Observable<StationReviewItem>;
  }

  getReviewById(id: string): Observable<StationReviewItem> {
    return this.api.get(`station-reviews/${id}`) as Observable<StationReviewItem>;
  }

  updateReview(id: string, rating?: number, comment?: string): Observable<StationReviewItem> {
    return this.api.patch(`station-reviews/${id}`, { rating, comment }) as Observable<StationReviewItem>;
  }

  deleteReview(id: string): Observable<DeleteStationReviewResponse> {
    return this.api.delete(`station-reviews/${id}`) as Observable<DeleteStationReviewResponse>;
  }
}
