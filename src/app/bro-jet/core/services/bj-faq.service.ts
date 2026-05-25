import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BjApiService } from './bj-api.service';
import { BjFaqResponse } from '../interfaces/faq.interface';

@Injectable({ providedIn: 'root' })
export class BjFaqService {
  constructor(private api: BjApiService) {}

  getFaqs(): Observable<BjFaqResponse> {
    return this.api.get('faqs') as Observable<BjFaqResponse>;
  }
}
