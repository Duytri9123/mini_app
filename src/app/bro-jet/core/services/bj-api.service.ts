import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class BjApiService {
  private readonly apiUrl = API_URL;

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('bj_access_token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
    
    let headers = new HttpHeaders({
      'Accept': 'application/json',
    });

    if (token) {
      // Log for debugging 401 issues - user can check this in browser console
      console.log(`[BjApiService] Using token for request: ${token.substring(0, 10)}...`);
      headers = headers.set('Authorization', `Bearer ${token}`);
    } else {
      console.warn('[BjApiService] No token found in localStorage');
    }

    return { headers };
  }

  get(endpoint: string) {
    const url = `${this.apiUrl}/${endpoint}`;
    console.log(`[BjApiService] GET ${url}`);
    return this.http.get(url, this.getHeaders());
  }

  post(endpoint: string, data: any) {
    const url = `${this.apiUrl}/${endpoint}`;
    console.log(`[BjApiService] POST ${url}`);
    return this.http.post(url, data, this.getHeaders());
  }

  patch(endpoint: string, data: any) {
    const url = `${this.apiUrl}/${endpoint}`;
    console.log(`[BjApiService] PATCH ${url}`);
    return this.http.patch(url, data, this.getHeaders());
  }

  put(endpoint: string, data: any) {
    const url = `${this.apiUrl}/${endpoint}`;
    console.log(`[BjApiService] PUT ${url}`);
    return this.http.put(url, data, this.getHeaders());
  }

  delete(endpoint: string) {
    const url = `${this.apiUrl}/${endpoint}`;
    console.log(`[BjApiService] DELETE ${url}`);
    return this.http.delete(url, this.getHeaders());
  }
}
