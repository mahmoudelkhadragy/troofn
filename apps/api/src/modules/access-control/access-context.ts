import type { PermissionScope, Role } from '@troofn/shared';

/**
 * Who is calling and which rows the checked permission lets them touch.
 * PermissionsGuard builds it; handlers receive it with @Access() and pass it to services,
 * which turn `scope` into a query filter (see scopes/).
 */
export interface AccessContext {
  userId: string;
  role: Role;
  clientId: string | null;
  scope: PermissionScope;
}
