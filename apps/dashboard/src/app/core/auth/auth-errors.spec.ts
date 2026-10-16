import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorCode, loginErrorMessage } from './auth-errors';

const apiError = (status: number, details?: unknown) =>
  new HttpErrorResponse({
    status,
    error: { success: false, error: { statusCode: status, message: 'x', details } },
  });

describe('apiErrorCode', () => {
  it('reads the code the API puts in error.details', () => {
    expect(apiErrorCode(apiError(403, { code: 'APP_NOT_ALLOWED' }))).toBe('APP_NOT_ALLOWED');
  });

  it('is undefined when there are no details, or the body is not an API error', () => {
    expect(apiErrorCode(apiError(403))).toBeUndefined();
    expect(apiErrorCode(apiError(403, ['a validation message']))).toBeUndefined();
    expect(apiErrorCode(new HttpErrorResponse({ status: 500, error: null }))).toBeUndefined();
    expect(
      apiErrorCode(new HttpErrorResponse({ status: 502, error: '<html>Bad gateway</html>' })),
    ).toBeUndefined();
  });
});

describe('loginErrorMessage', () => {
  it('401: wrong username or password', () => {
    expect(loginErrorMessage(apiError(401))).toBe('Incorrect username or password.');
  });

  it('403 APP_NOT_ALLOWED: tells owner/admin-only and points to the mobile app', () => {
    expect(loginErrorMessage(apiError(403, { code: 'APP_NOT_ALLOWED' }))).toMatch(
      /owner and admin.*mobile app/i,
    );
  });

  it('any other 403 (inactive account, client app access off) stays generic', () => {
    expect(loginErrorMessage(apiError(403))).toBe('This account does not have access.');
  });

  it('423 locked and 429 rate-limited', () => {
    expect(loginErrorMessage(apiError(423))).toMatch(/locked/i);
    expect(loginErrorMessage(apiError(429))).toMatch(/too many attempts/i);
  });

  it('anything else, including a network failure, asks to try again', () => {
    const generic = 'Unable to sign in right now. Please try again.';
    expect(loginErrorMessage(apiError(500))).toBe(generic);
    expect(loginErrorMessage(new HttpErrorResponse({ status: 0 }))).toBe(generic);
    expect(loginErrorMessage(new Error('boom'))).toBe(generic);
  });
});
