import { HttpErrorResponse } from '@angular/common/http';
import type { ApiError } from '@troofn/shared';

/** The machine-readable `code` the API puts in `error.details`, e.g. APP_NOT_ALLOWED. */
export function apiErrorCode(error: HttpErrorResponse): string | undefined {
  const details = (error.error as ApiError | null)?.error?.details;
  return typeof details === 'object' && details !== null && 'code' in details
    ? String(details.code)
    : undefined;
}

/** What the login page shows for a failed POST /auth/login. */
export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse))
    return 'Unable to sign in right now. Please try again.';
  switch (error.status) {
    case 401:
      return 'Incorrect username or password.';
    case 403:
      return apiErrorCode(error) === 'APP_NOT_ALLOWED'
        ? 'This dashboard is for owner and admin accounts. Please use the Troofn mobile app.'
        : 'This account does not have access.';
    case 423:
      return 'This account is locked. Please contact an administrator.';
    case 429:
      return 'Too many attempts. Please try again later.';
    default:
      return 'Unable to sign in right now. Please try again.';
  }
}
