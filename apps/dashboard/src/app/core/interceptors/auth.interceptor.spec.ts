import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { TokenStorage } from '@core/auth/token-storage';
import { environment } from '@env/environment';
import type { LoginResponse } from '@troofn/shared';
import { authInterceptor } from './auth.interceptor';

const api = environment.apiUrl;
const session = (n: number): LoginResponse =>
  ({
    accessToken: `access-${n}`,
    refreshToken: `refresh-${n}`,
    user: { permissions: { 'app.dashboard': 'ALL' } },
  }) as unknown as LoginResponse;

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  /** Signs in through the real login flow so AuthService holds access-1 / refresh-1. */
  const signIn = () => {
    TestBed.inject(AuthService).login({ username: 'owner', password: 'secret-1' }).subscribe();
    http.expectOne(`${api}/auth/login`).flush({ success: true, data: session(1) });
  };
  const unauthorized = { status: 401, statusText: 'Unauthorized' };

  beforeEach(() => {
    document.cookie = 'tf.refreshToken=; Path=/; Max-Age=0';
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('attaches the access token to API requests only', () => {
    signIn();
    client.get(`${api}/clients`).subscribe();
    client.get('https://example.com/x').subscribe();
    expect(http.expectOne(`${api}/clients`).request.headers.get('Authorization')).toBe(
      'Bearer access-1',
    );
    expect(http.expectOne('https://example.com/x').request.headers.has('Authorization')).toBe(
      false,
    );
  });

  it('on 401 refreshes once and retries with the new token', () => {
    signIn();
    let body: unknown;
    client.get(`${api}/clients`).subscribe((b) => (body = b));

    http.expectOne(`${api}/clients`).flush(null, unauthorized);
    const refresh = http.expectOne(`${api}/auth/refresh`);
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
    refresh.flush({ success: true, data: session(2) });

    const retry = http.expectOne(`${api}/clients`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({ ok: true });
    expect(body).toEqual({ ok: true });
  });

  it('two 401s at the same moment share one refresh', () => {
    signIn();
    client.get(`${api}/a`).subscribe();
    client.get(`${api}/b`).subscribe();
    http.expectOne(`${api}/a`).flush(null, unauthorized);
    http.expectOne(`${api}/b`).flush(null, unauthorized);

    http.expectOne(`${api}/auth/refresh`).flush({ success: true, data: session(2) });
    http.expectOne(`${api}/a`).flush({});
    http.expectOne(`${api}/b`).flush({});
  });

  it('sends the user to login when the refresh fails', () => {
    signIn();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let failed = false;
    client.get(`${api}/clients`).subscribe({ error: () => (failed = true) });

    http.expectOne(`${api}/clients`).flush(null, unauthorized);
    http.expectOne(`${api}/auth/refresh`).flush(null, unauthorized);
    expect(failed).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
    expect(TestBed.inject(TokenStorage).getRefreshToken()).toBeNull();
  });

  it('never refreshes for a 401 from /auth itself (wrong password)', () => {
    TestBed.inject(AuthService)
      .login({ username: 'x', password: 'bad-pass' })
      .subscribe({
        error: () => undefined,
      });
    http.expectOne(`${api}/auth/login`).flush(null, unauthorized);
    http.expectNone(`${api}/auth/refresh`);
  });
});
