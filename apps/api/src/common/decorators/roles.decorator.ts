import { SetMetadata } from '@nestjs/common';
import { Role } from '@troofn/shared';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given roles. Role checks are only the first gate —
 * services must still verify data ownership (client_id / assignment).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
