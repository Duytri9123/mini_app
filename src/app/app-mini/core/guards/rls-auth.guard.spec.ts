/**
 * Unit tests for `rlsAuthGuard` — the functional `CanActivateFn` protecting
 * personal routes. When a Sanctum token is present the guard allows activation;
 * otherwise it redirects to `/app-mini/login` carrying the attempted URL as
 * `returnUrl` so the user lands back where they wanted after logging in.
 *
 * The guard is run inside an injection context so `inject()` resolves the spied
 * `RlsAuthService` / `Router`. `RlsAuthService` is faked at the
 * `isAuthenticated()` boundary to keep the test focused on guard behavior.
 *
 * _Requirements: 1.5, 14.4_
 */
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { rlsAuthGuard } from './rls-auth.guard';
import { RlsAuthService } from '../services/rls-auth.service';

describe('rlsAuthGuard', () => {
  let auth: jasmine.SpyObj<RlsAuthService>;
  let router: jasmine.SpyObj<Router>;

  const route = {} as ActivatedRouteSnapshot;
  const stateFor = (url: string) => ({ url } as RouterStateSnapshot);

  const runGuard = (state: RouterStateSnapshot) =>
    TestBed.runInInjectionContext(() => rlsAuthGuard(route, state));

  beforeEach(() => {
    auth = jasmine.createSpyObj<RlsAuthService>('RlsAuthService', [
      'isAuthenticated',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: RlsAuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows activation when the user is authenticated', () => {
    auth.isAuthenticated.and.returnValue(true);

    const result = runGuard(stateFor('/app-mini/profile'));

    expect(result).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('blocks and redirects to login with returnUrl when unauthenticated', () => {
    auth.isAuthenticated.and.returnValue(false);

    const result = runGuard(stateFor('/app-mini/notifications'));

    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/app-mini/login'], {
      queryParams: { returnUrl: '/app-mini/notifications' },
      replaceUrl: true,
    });
  });
});
