import { PermissionScope } from '@troofn/shared';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { AccessContext } from '../access-context.js';

/** A filter that matches no row: used whenever a scope can't apply. Fails closed. */
const NOTHING = { id: { in: [] } } satisfies Prisma.ClientWhereInput;

/** Which client rows a caller may see, as a Prisma `where` fragment. */
export function clientScopeWhere(access: AccessContext): Prisma.ClientWhereInput {
  switch (access.scope) {
    case PermissionScope.ALL:
      return {};
    case PermissionScope.ASSIGNED:
      return { team: { some: { userId: access.userId } } };
    case PermissionScope.OWN_CLIENT:
      return access.clientId ? { id: access.clientId } : NOTHING;
    default:
      return NOTHING;
  }
}
