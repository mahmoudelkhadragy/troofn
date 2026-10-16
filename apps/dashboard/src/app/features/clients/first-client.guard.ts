import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, take } from 'rxjs';
import { ClientsApi } from './clients.api';

/**
 * /dashboard has no page of its own: it opens the first client of the list, so the address bar
 * and the highlighted sidebar item always agree. With no clients, or when the list cannot be
 * loaded, it lets the page show its own empty / error message.
 */
export const firstClientGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(ClientsApi)
    .list()
    .pipe(
      take(1),
      map((clients) =>
        clients.length ? router.createUrlTree(['/dashboard', 'clients', clients[0].id]) : true,
      ),
      catchError(() => of(true)),
    );
};
