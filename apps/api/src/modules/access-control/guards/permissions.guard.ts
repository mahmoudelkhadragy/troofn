import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload, Permission } from '@troofn/shared';
import { IS_AUTHENTICATED_ONLY_KEY, IS_PUBLIC_KEY } from '../../../common/decorators/index.js';
import type { AccessContext } from '../access-context.js';
import { AccessControlService } from '../access-control.service.js';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator.js';

const DENIED = 'You do not have permission to perform this action';

/**
 * Global guard that runs after JwtAuthGuard. Reads @RequirePermissions(), checks the
 * caller's role holds each permission, and puts an AccessContext (with the scope) on
 * the request. It answers "may you do this at all?"; services answer "on which rows?".
 *
 * Deny by default: every route must declare @Public(), @Authenticated() or
 * @RequirePermissions(). A route that declares nothing is 403 for everyone.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControl: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const required = this.reflector.getAllAndOverride<Permission[]>(
      REQUIRED_PERMISSIONS_KEY,
      targets,
    );
    if (!required?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayload; access?: AccessContext }>();
    const user = request.user;
    if (!user) throw new ForbiddenException(DENIED);

    const scopes = await Promise.all(
      required.map((p) => this.accessControl.scopeFor(user.role, p)),
    );
    if (scopes.some((scope) => scope === undefined)) throw new ForbiddenException(DENIED);

    request.access = {
      userId: user.sub,
      role: user.role,
      clientId: user.clientId,
      scope: scopes[0]!,
    };
    return true;
  }
}
