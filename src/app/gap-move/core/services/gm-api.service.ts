import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from 'src/environments/environment';
import { GM_STORAGE_KEYS } from '../constants/gm-api.constants';

@Injectable({ providedIn: 'root' })
export class GmApiService {
  private readonly apiUrl = API_URL;

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string) {
    return this.http.get<T>(this.url(endpoint), this.options());
  }

  post<T>(endpoint: string, data: unknown) {
    return this.http.post<T>(this.url(endpoint), data, this.options());
  }

  patch<T>(endpoint: string, data: unknown) {
    return this.http.patch<T>(this.url(endpoint), data, this.options());
  }

  put<T>(endpoint: string, data: unknown) {
    return this.http.put<T>(this.url(endpoint), data, this.options());
  }

  delete<T>(endpoint: string) {
    return this.http.delete<T>(this.url(endpoint), this.options());
  }

  private url(endpoint: string): string {
    return `${this.apiUrl}/${endpoint.replace(/^\/+/, '')}`;
  }

  private options() {
    const token = localStorage.getItem(GM_STORAGE_KEYS.accessToken);
    let headers = new HttpHeaders({ Accept: 'application/json' });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return { headers };
  }
}
