import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { Role } from '@troofn/shared';
import { AuthService } from '@core/auth/auth.service';

/**
 * Restricts a route to specific roles:
 *   { path: 'employees', canActivate: [roleGuard(Role.ADMIN)], ... }
 * UI guards are for UX only — the API enforces permissions.
 */
export const roleGuard =
  (...roles: Role[]): CanActivateFn =>
  () =>
    inject(AuthService).hasRole(...roles) || inject(Router).createUrlTree(['/']);
