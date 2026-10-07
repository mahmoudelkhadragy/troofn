import { PermissionScope } from '@troofn/shared';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { AccessContext } from '../access-context.js';

const NOTHING = { id: { in: [] } } satisfies Prisma.UserWhereInput;

/** Which user accounts a caller may see or manage. Today only admin (ALL) holds users.*. */
export function userScopeWhere(access: AccessContext): Prisma.UserWhereInput {
  switch (access.scope) {
    case PermissionScope.ALL:
      return {};
    case PermissionScope.OWN_CLIENT:
      return access.clientId ? { clientId: access.clientId } : NOTHING;
    case PermissionScope.OWN:
      return { id: access.userId };
    default:
      return NOTHING;
  }
}
