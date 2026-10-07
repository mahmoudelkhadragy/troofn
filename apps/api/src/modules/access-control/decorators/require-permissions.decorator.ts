import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@troofn/shared';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';

/**
 * The caller's role must hold every listed permission (403 otherwise).
 * The scope of the first one is handed to the handler through @Access().
 *
 *   @RequirePermissions(Permission.CLIENTS_READ)
 *   findAll(@Access() access: AccessContext) { … }
 */
export const RequirePermissions = (...permissions: [Permission, ...Permission[]]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
