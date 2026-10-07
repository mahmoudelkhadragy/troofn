import { SetMetadata } from '@nestjs/common';

export const IS_AUTHENTICATED_ONLY_KEY = 'isAuthenticatedOnly';

/**
 * Explicitly allows any signed-in user, with no specific permission: own profile,
 * logout, change own password. Without this or @RequirePermissions() (or @Public()),
 * PermissionsGuard answers 403, so a forgotten decorator can never expose a route.
 */
export const Authenticated = () => SetMetadata(IS_AUTHENTICATED_ONLY_KEY, true);
