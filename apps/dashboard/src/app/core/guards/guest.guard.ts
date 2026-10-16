import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

/** Keeps signed-in dashboard users out of the login screen. */
export const guestGuard: CanActivateFn = () =>
  inject(AuthService).canUseDashboard() ? inject(Router).createUrlTree(['/dashboard']) : true;
