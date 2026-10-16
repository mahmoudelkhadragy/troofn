import { inject, provideAppInitializer } from '@angular/core';
import { AuthService } from './auth.service';

/** Restores the session from the stored refresh token before the router runs its guards. */
export const provideAuthInitializer = () =>
  provideAppInitializer(() => inject(AuthService).restoreSession());
