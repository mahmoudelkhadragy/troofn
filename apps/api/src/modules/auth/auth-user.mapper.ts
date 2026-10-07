import type { AuthUser, PermissionScope, Role } from '@troofn/shared';
import { Prisma } from '../../generated/prisma/client.js';

/**
 * The only columns ever read to build a profile. Selecting explicitly (instead of
 * returning the Prisma row) guarantees password and token hashes never reach a response.
 */
export const authUserSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  phone: true,
  status: true,
  mustChangePassword: true,
  lastLoginAt: true,
  deletedAt: true,
  clientId: true,
  role: {
    select: {
      key: true,
      nameAr: true,
      nameEn: true,
      permissions: { select: { scope: true, permission: { select: { key: true } } } },
    },
  },
  client: {
    select: {
      id: true,
      code: true,
      companyName: true,
      status: true,
      appAccessEnabled: true,
      deletedAt: true,
    },
  },
} satisfies Prisma.UserSelect;

export type AuthUserRow = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

export function toAuthUser(row: AuthUserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    email: row.email,
    phone: row.phone,
    role: row.role.key as Role,
    roleName: { ar: row.role.nameAr, en: row.role.nameEn },
    client: row.client
      ? { id: row.client.id, code: row.client.code, companyName: row.client.companyName }
      : null,
    mustChangePassword: row.mustChangePassword,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    permissions: Object.fromEntries(
      row.role.permissions.map(({ permission, scope }) => [
        permission.key,
        scope as PermissionScope,
      ]),
    ),
  };
}

/**
 * Why this account may not sign in right now, or null if it may.
 * Checked at login and again on every refresh.
 */
export function signInBlocker(row: AuthUserRow): string | null {
  if (row.deletedAt) return 'Account not found';
  if (row.status !== 'ACTIVE') return 'Account is inactive';
  if (row.clientId) {
    const client = row.client;
    if (!client || client.deletedAt || client.status !== 'ACTIVE')
      return 'Client account is inactive';
    if (!client.appAccessEnabled) return 'App access is disabled for this client';
  }
  return null;
}
