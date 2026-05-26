import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GmAuthService } from '../services/gm-auth.service';

export const gmAuthGuard: CanActivateFn = (_route, state) => {
  const auth = inject(GmAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  router.navigate(['/gap-move/login'], {
    queryParams: { returnUrl: state.url },
    replaceUrl: true,
  });
  return false;
};
