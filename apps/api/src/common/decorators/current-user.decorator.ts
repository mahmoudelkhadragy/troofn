import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@troofn/shared';

/** Injects the authenticated user (JWT payload) into a route handler. */
export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
