import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { Permission } from '@troofn/shared';
import { AuthService } from '@core/auth/auth.service';

/**
 * Restricts a route to users holding every listed permission:
 *   { path: 'users', canActivate: [permissionGuard(Permission.USERS_READ)], ... }
 * UI guards are for UX only — the API enforces the same permissions on every endpoint.
 */
export const permissionGuard =
  (...required: Permission[]): CanActivateFn =>
  () => {
    const permissions = inject(AuthService).user()?.permissions ?? {};
    return required.every((p) => p in permissions) || inject(Router).createUrlTree(['/dashboard']);
  };
