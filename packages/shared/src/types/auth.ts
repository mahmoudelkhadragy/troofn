import type { Role } from '../enums/role.enum';

/** Payload stored inside the JWT access token. */
export interface JwtPayload {
  sub: string;
  role: Role;
  clientId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  clientId?: string | null;
}
