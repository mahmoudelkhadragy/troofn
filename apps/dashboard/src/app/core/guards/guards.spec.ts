import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  provideRouter,
  type RouterStateSnapshot,
  Router,
  UrlTree,
} from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { Permission } from '@troofn/shared';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';
import { permissionGuard } from './permission.guard';

/** The slice of AuthService the guards read. */
function fakeAuth(state: { signedIn: boolean; permissions: Record<string, string> }) {
  const user = signal(state.signedIn ? { permissions: state.permissions } : null);
  return {
    user,
    isAuthenticated: () => user() !== null,
    canUseDashboard: () => user() !== null && 'app.dashboard' in (user()?.permissions ?? {}),
    clearSession: vi.fn(() => user.set(null)),
  };
}

const owner = { signedIn: true, permissions: { 'app.dashboard': 'ALL', 'users.read': 'ALL' } };
// Signed in, but only with a mobile-app role: no dashboard permission.
const mobileOnly = { signedIn: true, permissions: { 'app.mobile': 'OWN' } };
const anonymous = { signedIn: false, permissions: {} };

describe('route guards', () => {
  const run = (guard: (...args: never[]) => unknown, url = '/dashboard') =>
    TestBed.runInInjectionContext(() =>
      (guard as (r: ActivatedRouteSnapshot, s: RouterStateSnapshot) => unknown)(
        {} as ActivatedRouteSnapshot,
        { url } as RouterStateSnapshot,
      ),
    );
  const urlOf = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  const setup = (state: Parameters<typeof fakeAuth>[0]) => {
    const auth = fakeAuth(state);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    return auth;
  };

  describe('authGuard', () => {
    it('lets an owner or admin in (they hold app.dashboard)', () => {
      setup(owner);
      expect(run(authGuard)).toBe(true);
    });

    it('sends an anonymous visitor to login and remembers where they were going', () => {
      setup(anonymous);
      expect(urlOf(run(authGuard, '/dashboard/clients'))).toBe(
        '/login?returnUrl=%2Fdashboard%2Fclients',
      );
    });

    it('refuses a signed-in user without app.dashboard and ends that session', () => {
      const auth = setup(mobileOnly);
      expect(urlOf(run(authGuard))).toContain('/login');
      expect(auth.clearSession).toHaveBeenCalledOnce();
    });

    it('does not clear anything for an anonymous visitor', () => {
      const auth = setup(anonymous);
      run(authGuard);
      expect(auth.clearSession).not.toHaveBeenCalled();
    });
  });

  describe('guestGuard', () => {
    it('shows the login page to an anonymous visitor', () => {
      setup(anonymous);
      expect(run(guestGuard)).toBe(true);
    });

    it('sends a signed-in dashboard user to the dashboard instead of the login page', () => {
      setup(owner);
      expect(urlOf(run(guestGuard))).toBe('/dashboard');
    });

    it('still shows the login page to a signed-in user who cannot use the dashboard', () => {
      setup(mobileOnly);
      expect(run(guestGuard)).toBe(true);
    });
  });

  describe('permissionGuard', () => {
    it('lets in a user holding every listed permission', () => {
      setup(owner);
      expect(run(permissionGuard(Permission.USERS_READ))).toBe(true);
      expect(run(permissionGuard(Permission.USERS_READ, Permission.APP_DASHBOARD))).toBe(true);
    });

    it('sends the user to the dashboard when one permission is missing', () => {
      setup(owner);
      expect(urlOf(run(permissionGuard(Permission.USERS_READ, Permission.CLIENTS_DELETE)))).toBe(
        '/dashboard',
      );
    });

    it('refuses everything when nobody is signed in', () => {
      setup(anonymous);
      expect(urlOf(run(permissionGuard(Permission.USERS_READ)))).toBe('/dashboard');
    });
  });
});
