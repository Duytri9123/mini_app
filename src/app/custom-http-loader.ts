// src/app/custom-http-loader.ts
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export class CustomHttpLoader implements TranslateLoader {
  constructor(private http: HttpClient) { }

  // getTranslation(lang: string): Observable<TranslationObject> {
  //   return this.http.get<TranslationObject>(`./assets/i18n/${lang}.json`);
  // }
  getTranslation(lang: string): Observable<TranslationObject> {
    return this.http.get<TranslationObject>(`./assets/i18n/${lang}.json`);
  }
}
