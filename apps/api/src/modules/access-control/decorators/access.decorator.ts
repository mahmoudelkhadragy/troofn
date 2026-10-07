import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AccessContext } from '../access-context.js';

/** Injects the AccessContext built by PermissionsGuard (user + scope of the checked permission). */
export const Access = createParamDecorator((_: unknown, ctx: ExecutionContext): AccessContext => {
  const access = ctx.switchToHttp().getRequest<{ access?: AccessContext }>().access;
  if (!access) throw new Error('@Access() used on a route without @RequirePermissions()');
  return access;
});
