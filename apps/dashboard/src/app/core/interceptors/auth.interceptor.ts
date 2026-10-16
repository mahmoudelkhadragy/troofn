import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AUTH_ENDPOINT } from '@core/auth/auth-api';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@env/environment';
import { catchError, switchMap, throwError } from 'rxjs';

const withToken = (req: HttpRequest<unknown>, token: string) =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

/**
 * Attaches the access token to API requests. On a 401 it refreshes the tokens once and
 * retries the request; if the refresh fails, the session is over and the user goes to login.
 * Requests to /auth itself (AUTH_ENDPOINT) pass through untouched.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl) || req.context.get(AUTH_ENDPOINT)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const sentWith = auth.accessToken;

  return next(sentWith ? withToken(req, sentWith) : req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      // Another request already refreshed while this one was in flight: just retry.
      const current = auth.accessToken;
      if (current && current !== sentWith) return next(withToken(req, current));

      return auth.refreshTokens().pipe(
        switchMap((token) => next(withToken(req, token))),
        catchError((refreshError: unknown) => {
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
