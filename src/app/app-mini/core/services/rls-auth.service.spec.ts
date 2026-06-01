/**
 * Unit tests for RlsAuthService — verifies the Sanctum session lifecycle:
 * register / login / Google store the token (`rls_access_token`) + profile and
 * emit `currentUser$`; `/auth/me` sync is cached + deduped; logout always clears
 * client state; and the token/role accessors used by `RlsAuthGuard`.
 *
 * `RlsApiService` is replaced with a jasmine spy so no real HTTP happens — the
 * service under test only ever sees unwrapped `data` payloads, matching how
 * `RlsApiService` behaves in production. Token attachment / 401 handling are the
 * interceptor's job and are intentionally not tested here.
 *
 * _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 14.4_
 */
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RlsAuthService } from './rls-auth.service';
import { RlsApiService } from './rls-api.service';
import {
  RLS_ACCESS_TOKEN,
  RLS_USER_KEY,
} from '../interceptors/rls-auth.interceptor';
import { RLS_API } from '../constants/rls-config.constants';

describe('RlsAuthService', () => {
  let service: RlsAuthService;
  let api: jasmine.SpyObj<RlsApiService>;

  /** A representative backend `data` payload for register/login/google. */
  const authPayload = {
    access_token: 'tok-123',
    token_type: 'Bearer',
    user: {
      id: 7,
      username: 'neo',
      email: 'neo@example.com',
      display_name: 'Neo Anderson',
      avatar_url: 'https://cdn/x.png',
      role: 'moderator',
      home_geohash: 'w21z',
      campus_community_id: 3,
    },
  };

  beforeEach(() => {
    localStorage.clear();
    api = jasmine.createSpyObj<RlsApiService>('RlsApiService', [
      'get',
      'post',
      'put',
      'patch',
      'delete',
    ]);

    TestBed.configureTestingModule({
      providers: [
        RlsAuthService,
        { provide: RlsApiService, useValue: api },
      ],
    });
    service = TestBed.inject(RlsAuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('is created with no user when storage is empty', () => {
    expect(service).toBeTruthy();
    expect(service.getCurrentUser()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  describe('register / login / google store the session', () => {
    it('register persists token + normalized user and emits currentUser$', () => {
      api.post.and.returnValue(of(authPayload));
      let emitted: unknown;
      service.currentUser$.subscribe((u) => (emitted = u));

      let result: unknown;
      service
        .register({
          display_name: 'Neo Anderson',
          email: 'neo@example.com',
          password: 'matrix1234',
          password_confirmation: 'matrix1234',
        })
        .subscribe((r) => (result = r));

      expect(api.post).toHaveBeenCalledWith(RLS_API.REGISTER, jasmine.any(Object));
      expect(localStorage.getItem(RLS_ACCESS_TOKEN)).toBe('tok-123');
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.getCurrentUser()?.id).toBe(7);
      expect(service.getCurrentUser()?.displayName).toBe('Neo Anderson');
      expect(service.getRole()).toBe('moderator');
      expect((result as { accessToken: string }).accessToken).toBe('tok-123');
      expect((emitted as { id: number })?.id).toBe(7);
    });

    it('login persists the session via the login endpoint', () => {
      api.post.and.returnValue(of(authPayload));
      service
        .login({ email: 'neo@example.com', password: 'matrix1234' })
        .subscribe();

      expect(api.post).toHaveBeenCalledWith(RLS_API.LOGIN, jasmine.any(Object));
      expect(localStorage.getItem(RLS_ACCESS_TOKEN)).toBe('tok-123');
      expect(localStorage.getItem(RLS_USER_KEY)).toContain('neo@example.com');
    });

    it('loginWithGoogle persists the session via the google endpoint', () => {
      api.post.and.returnValue(of(authPayload));
      service.loginWithGoogle({ id_token: 'g-id' }).subscribe();

      expect(api.post).toHaveBeenCalledWith(RLS_API.GOOGLE, jasmine.any(Object));
      expect(service.getAccessToken()).toBe('tok-123');
    });

    it('accepts the `token` alias when `access_token` is absent', () => {
      api.post.and.returnValue(of({ token: 'alias-tok', user: { id: 1 } }));
      service.login({ email: 'a@b.c', password: 'pw123456' }).subscribe();
      expect(service.getAccessToken()).toBe('alias-tok');
    });

    it('throws and stores nothing when the response has no token', () => {
      api.post.and.returnValue(of({ user: { id: 1 } }));
      let error: unknown;
      service
        .login({ email: 'a@b.c', password: 'pw123456' })
        .subscribe({ error: (e) => (error = e) });

      expect(error).toEqual(jasmine.any(Error));
      expect(localStorage.getItem(RLS_ACCESS_TOKEN)).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      api.post.and.returnValue(of(authPayload));
      service.login({ email: 'neo@example.com', password: 'matrix1234' }).subscribe();
    });

    it('revokes the token server-side and clears client session on success', () => {
      api.post.calls.reset();
      api.post.and.returnValue(of({}));

      service.logout().subscribe();

      expect(api.post).toHaveBeenCalledWith(RLS_API.LOGOUT, {});
      expect(localStorage.getItem(RLS_ACCESS_TOKEN)).toBeNull();
      expect(localStorage.getItem(RLS_USER_KEY)).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('still clears client session when the revoke request errors', () => {
      api.post.calls.reset();
      api.post.and.returnValue(throwError(() => new Error('network down')));

      service.logout().subscribe({ error: () => void 0 });

      expect(localStorage.getItem(RLS_ACCESS_TOKEN)).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('syncCurrentUser', () => {
    it('calls /auth/me, normalizes, and updates state', () => {
      api.get.and.returnValue(of({ user: authPayload.user }));
      let synced: unknown;
      service.syncCurrentUser().subscribe((u) => (synced = u));

      expect(api.get).toHaveBeenCalledWith(RLS_API.ME);
      expect((synced as { id: number }).id).toBe(7);
      expect(service.getCurrentUser()?.email).toBe('neo@example.com');
    });

    it('returns the cached user within the TTL without re-hitting the API', () => {
      api.get.and.returnValue(of(authPayload.user));
      service.syncCurrentUser().subscribe();
      service.syncCurrentUser().subscribe();
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('force=true bypasses the cache', () => {
      api.get.and.returnValue(of(authPayload.user));
      service.syncCurrentUser().subscribe();
      service.syncCurrentUser(true).subscribe();
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('accessors', () => {
    it('isAuthenticated reflects token presence', () => {
      expect(service.isAuthenticated()).toBeFalse();
      localStorage.setItem(RLS_ACCESS_TOKEN, 'x');
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('getRole defaults to "user" when no profile is loaded', () => {
      expect(service.getRole()).toBe('user');
    });

    it('updateCurrentUser normalizes and re-emits the profile', () => {
      const updated = service.updateCurrentUser({ id: 9, display_name: 'Trinity' });
      expect(updated.id).toBe(9);
      expect(updated.displayName).toBe('Trinity');
      expect(service.getCurrentUser()?.id).toBe(9);
    });

    it('restores a stored profile on construction', () => {
      localStorage.setItem(RLS_ACCESS_TOKEN, 'tok');
      localStorage.setItem(
        RLS_USER_KEY,
        JSON.stringify({ id: 42, displayName: 'Morpheus', role: 'admin' }),
      );
      const fresh = TestBed.runInInjectionContext(() => new RlsAuthService());
      expect(fresh.getCurrentUser()?.id).toBe(42);
      expect(fresh.getRole()).toBe('admin');
    });
  });
});
