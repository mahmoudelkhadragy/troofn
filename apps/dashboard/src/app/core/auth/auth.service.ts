import { computed, Injectable, signal } from '@angular/core';
import type { AuthUser, Role } from '@troofn/shared';

const ACCESS_TOKEN_KEY = 'tf.accessToken';

/**
 * Holds the signed-in user and access token.
 * login / refresh / logout calls are wired to the API in roadmap phase 1.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<AuthUser | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  get accessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  hasRole(...roles: Role[]): boolean {
    const user = this._user();
    return !!user && roles.includes(user.role);
  }

  clearSession(): void {
    this._user.set(null);
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }
}
