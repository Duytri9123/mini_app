/**
 * Unit tests for RlsApiService — verifies the HTTP wrapper builds URLs from
 * `API_URL`, serializes query params, and unwraps the standard
 * `{ data, meta?, message? }` envelope.
 *
 * Uses Angular's HttpClientTestingModule so requests are asserted without a real
 * network. Token attachment is intentionally NOT tested here: it is the
 * responsibility of `RlsAuthInterceptor`, not this service.
 *
 * _Requirements: 14.3, 16.1_
 */
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { API_URL } from 'src/environments/environment';
import { RlsApiService } from './rls-api.service';
import { RlsApiEnvelope } from '../interfaces';

describe('RlsApiService', () => {
  let service: RlsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RlsApiService],
    });
    service = TestBed.inject(RlsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('URL building', () => {
    it('joins API_URL with a relative endpoint without double slashes', () => {
      service.get('/auth/me').subscribe();
      const req = httpMock.expectOne(`${API_URL}/auth/me`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: null });
    });

    it('accepts an endpoint without a leading slash', () => {
      service.get('feed').subscribe();
      const req = httpMock.expectOne(`${API_URL}/feed`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: [] });
    });
  });

  describe('envelope unwrapping', () => {
    it('GET returns only the data payload by default', () => {
      const payload = { id: 1, name: 'Cafe' };
      let result: unknown;
      service.get<typeof payload>('/locations/1').subscribe((d) => (result = d));

      const req = httpMock.expectOne(`${API_URL}/locations/1`);
      req.flush({ data: payload, message: 'ok' } as RlsApiEnvelope);
      expect(result).toEqual(payload);
    });

    it('getEnvelope returns the full envelope including meta and message', () => {
      const envelope: RlsApiEnvelope<number[]> = {
        data: [1, 2, 3],
        meta: { nextCursor: 'abc' },
        message: 'page 1',
      };
      let result: RlsApiEnvelope<number[]> | undefined;
      service.getEnvelope<number[]>('/feed').subscribe((e) => (result = e));

      const req = httpMock.expectOne(`${API_URL}/feed`);
      req.flush(envelope);
      expect(result).toEqual(envelope);
      expect(result?.meta?.nextCursor).toBe('abc');
    });

    it('falls back to the raw body when the response is not enveloped', () => {
      const raw = [{ id: 1 }];
      let result: unknown;
      service.get('/legacy').subscribe((d) => (result = d));

      const req = httpMock.expectOne(`${API_URL}/legacy`);
      req.flush(raw);
      expect(result).toEqual(raw);
    });
  });

  describe('query param serialization', () => {
    it('serializes a flat params object and skips null/undefined', () => {
      service
        .get('/map/nearby', { lat: 10.5, lng: 106.6, radius: undefined, q: null })
        .subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${API_URL}/map/nearby`
      );
      expect(req.request.params.get('lat')).toBe('10.5');
      expect(req.request.params.get('lng')).toBe('106.6');
      expect(req.request.params.has('radius')).toBeFalse();
      expect(req.request.params.has('q')).toBeFalse();
      req.flush({ data: [] });
    });

    it('expands array params into repeated keys', () => {
      service.get('/map/markers', { types: ['food', 'cafe'] }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/map/markers`);
      expect(req.request.params.getAll('types')).toEqual(['food', 'cafe']);
      req.flush({ data: [] });
    });
  });

  describe('write verbs', () => {
    it('POST sends the body and unwraps data', () => {
      const body = { content: 'hello' };
      const created = { id: 99, content: 'hello' };
      let result: unknown;
      service.post('/posts', body).subscribe((d) => (result = d));

      const req = httpMock.expectOne(`${API_URL}/posts`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ data: created });
      expect(result).toEqual(created);
    });

    it('POST sends an empty object body when none is provided', () => {
      service.post('/auth/logout').subscribe();
      const req = httpMock.expectOne(`${API_URL}/auth/logout`);
      expect(req.request.body).toEqual({});
      req.flush({ data: null });
    });

    it('PUT, PATCH, and DELETE hit the right method and unwrap data', () => {
      service.put('/locations/1', { name: 'x' }).subscribe();
      httpMock.expectOne(`${API_URL}/locations/1`).flush({ data: { id: 1 } });

      service.patch('/posts/1', { content: 'y' }).subscribe();
      const patchReq = httpMock.expectOne(`${API_URL}/posts/1`);
      expect(patchReq.request.method).toBe('PATCH');
      patchReq.flush({ data: { id: 1 } });

      service.delete('/posts/1').subscribe();
      const delReq = httpMock.expectOne(`${API_URL}/posts/1`);
      expect(delReq.request.method).toBe('DELETE');
      delReq.flush({ data: true });
    });
  });
});
