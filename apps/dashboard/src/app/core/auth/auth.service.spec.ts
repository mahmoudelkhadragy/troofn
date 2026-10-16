import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type { AuthUser, LoginResponse } from '@troofn/shared';
import { AuthService } from './auth.service';
import { TokenStorage } from './token-storage';

const user = (permissions: Record<string, string>): AuthUser =>
  ({ id: 'u1', username: 'owner', role: 'owner', permissions }) as unknown as AuthUser;

const session = (
  refreshToken: string,
  permissions: Record<string, string> = { 'app.dashboard': 'ALL' },
): LoginResponse =>
  ({
    tokenType: 'Bearer',
    accessToken: `access-for-${refreshToken}`,
    expiresIn: 900,
    refreshToken,
    refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    user: user(permissions),
  }) as LoginResponse;

describe('AuthService', () => {
  let auth: AuthService;
  let storage: TokenStorage;
  let http: HttpTestingController;

  beforeEach(() => {
    document.cookie = 'tf.refreshToken=; Path=/; Max-Age=0';
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    storage = TestBed.inject(TokenStorage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('logs in to the dashboard app and keeps the session', () => {
    auth.login({ username: 'owner', password: 'secret-1' }).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.body).toEqual({
      username: 'owner',
      password: 'secret-1',
      app: 'DASHBOARD',
      platform: 'WEB',
    });
    req.flush({ success: true, data: session('r1') });

    expect(auth.accessToken).toBe('access-for-r1');
    expect(auth.canUseDashboard()).toBe(true);
    expect(storage.getRefreshToken()).toBe('r1');
  });

  it('canUseDashboard follows the app.dashboard permission, not the role', () => {
    auth.login({ username: 'x', password: 'secret-1' }).subscribe();
    http
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ success: true, data: session('r1', { 'app.mobile': 'OWN' }) });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.canUseDashboard()).toBe(false);
  });

  it('logout clears the session at once and tells the API', () => {
    auth.login({ username: 'owner', password: 'secret-1' }).subscribe();
    http
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ success: true, data: session('r1') });

    auth.logout().subscribe();
    expect(auth.isAuthenticated()).toBe(false);
    expect(storage.getRefreshToken()).toBeNull();
    const req = http.expectOne(`${environment.apiUrl}/auth/logout`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-for-r1');
    req.flush(null);
  });

  it('restores the session from the stored refresh token', async () => {
    storage.setRefreshToken('stored');
    const restored = auth.restoreSession();
    const req = http.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(req.request.body).toEqual({ refreshToken: 'stored' });
    req.flush({ success: true, data: session('rotated') });
    await restored;

    expect(auth.canUseDashboard()).toBe(true);
    expect(storage.getRefreshToken()).toBe('rotated');
  });

  it('does not call the API on start when nothing is stored', async () => {
    await auth.restoreSession();
    http.expectNone(`${environment.apiUrl}/auth/refresh`);
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('shares one refresh request between concurrent callers (single flight)', () => {
    storage.setRefreshToken('stored');
    const tokens: string[] = [];
    auth.refreshTokens().subscribe((t) => tokens.push(t));
    auth.refreshTokens().subscribe((t) => tokens.push(t));

    http
      .expectOne(`${environment.apiUrl}/auth/refresh`)
      .flush({ success: true, data: session('rotated') });
    expect(tokens).toEqual(['access-for-rotated', 'access-for-rotated']);
  });

  it('a failed refresh ends the session', () => {
    storage.setRefreshToken('stored');
    auth.refreshTokens().subscribe({ error: () => undefined });
    http
      .expectOne(`${environment.apiUrl}/auth/refresh`)
      .flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
    expect(storage.getRefreshToken()).toBeNull();
  });
});
