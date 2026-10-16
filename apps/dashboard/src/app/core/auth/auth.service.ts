import { computed, inject, Injectable, signal } from '@angular/core';
import { type AuthUser, type LoginResponse, Permission } from '@troofn/shared';
import {
  catchError,
  finalize,
  firstValueFrom,
  map,
  type Observable,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { AuthApi } from './auth-api';
import type { LoginCredentials } from './auth.model';
import { TokenStorage } from './token-storage';

/**
 * The signed-in session: who the user is and the current access token. Everything else
 * (guards, interceptor, menus) reads it from here, so the "who may use the dashboard"
 * rule is written once, in canUseDashboard.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApi);
  private readonly storage = inject(TokenStorage);

  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<AuthUser | null>(null);
  /** The refresh in progress, shared by every caller (see refreshTokens). */
  private refreshInFlight: Observable<string> | null = null;

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null && this._accessToken() !== null);
  /** The same rule the API enforces at login: the role holds app.dashboard (owner and admin). */
  readonly canUseDashboard = computed(
    () => this.isAuthenticated() && !!this._user()?.permissions[Permission.APP_DASHBOARD],
  );

  get accessToken(): string | null {
    return this._accessToken();
  }

  /** Signs in to the dashboard. The API refuses (403 APP_NOT_ALLOWED) roles other than owner and admin. */
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.api
      .login({ ...credentials, app: 'DASHBOARD', platform: 'WEB' })
      .pipe(tap((session) => this.setSession(session)));
  }

  /** Ends the session here at once, then tells the API. A failed API call is ignored. */
  logout(): Observable<void> {
    const token = this._accessToken();
    this.clearSession();
    if (!token) return of(undefined);
    return this.api.logout(token).pipe(catchError(() => of(undefined)));
  }

  /**
   * Runs before the first route (auth.initializer.ts). With a stored refresh token it asks
   * the API for a new session, so a page reload keeps the user signed in.
   */
  async restoreSession(): Promise<void> {
    if (!this.storage.getRefreshToken()) return;
    await firstValueFrom(this.refreshTokens().pipe(catchError(() => of(null))));
  }

  /**
   * Exchanges the refresh token for a new pair and returns the new access token.
   *
   * Single flight: every caller during a refresh shares one request. The API rotates the
   * refresh token, so a second request with the same old token looks like theft and
   * revokes the whole session.
   */
  refreshTokens(): Observable<string> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    this.refreshInFlight ??= this.api.refresh(refreshToken).pipe(
      tap((session) => this.setSession(session)),
      map((session) => session.accessToken),
      catchError((error: unknown) => {
        this.clearSession();
        return throwError(() => error);
      }),
      finalize(() => (this.refreshInFlight = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshInFlight;
  }

  clearSession(): void {
    this._accessToken.set(null);
    this._user.set(null);
    this.storage.clear();
  }

  private setSession(session: LoginResponse): void {
    this._accessToken.set(session.accessToken);
    this._user.set(session.user);
    this.storage.setRefreshToken(session.refreshToken, session.refreshTokenExpiresAt);
  }
}
