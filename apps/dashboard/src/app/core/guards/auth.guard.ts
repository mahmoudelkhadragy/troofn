import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

/**
 * Lets in owner and admin (canUseDashboard). Anyone else goes to login, remembering the
 * requested route. The session was already restored by auth.initializer.ts.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.canUseDashboard()) return true;
  // Signed in, but not with a dashboard role (e.g. its role changed): end that session.
  if (auth.isAuthenticated()) auth.clearSession();
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
