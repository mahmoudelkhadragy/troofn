import type { PermissionScope } from '../enums/permission.enum';
import type { Role } from '../enums/role.enum';

/** Claims inside the JWT access token. */
export interface JwtPayload {
  /** User id. */
  sub: string;
  role: Role;
  /** The user's client company (client roles only). */
  clientId: string | null;
  /** Session id: the login this token belongs to (logout revokes it). */
  sid: string;
  /** "Must change password": while true, only the change-password routes work. */
  mcp: boolean;
}

export type SessionPlatform = 'WEB' | 'IOS' | 'ANDROID' | 'UNKNOWN';

export interface AuthTokens {
  tokenType: 'Bearer';
  accessToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  /** Opaque; send it to POST /auth/refresh. Rotated on every refresh. */
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

/** The signed-in user, as returned by /auth/login and /auth/me. */
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  roleName: { ar: string; en: string };
  client: { id: string; code: string; companyName: string } | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  /** permission key → scope, e.g. { "clients.read": "ASSIGNED" }. Drives navigation. */
  permissions: Record<string, PermissionScope>;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}
