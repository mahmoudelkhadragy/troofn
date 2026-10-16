import type { ClientApp, SessionPlatform } from '@troofn/shared';

/** What the user types on the login page. AuthService adds the app and platform. */
export interface LoginCredentials {
  username: string;
  password: string;
}

/** The body of POST /auth/login as the dashboard sends it. */
export interface LoginRequest extends LoginCredentials {
  app: ClientApp;
  platform: SessionPlatform;
}
