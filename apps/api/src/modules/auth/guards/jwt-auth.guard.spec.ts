import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { type JwtPayload, Role } from '@troofn/shared';
import { AllowPendingPasswordChange, Public } from '../../../common/decorators/index.js';
import { TokenService } from '../token.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const tokens = new TokenService(
  new JwtService(),
  new ConfigService({
    auth: { accessSecret: 'guard-test-secret-at-least-32-characters', accessTtlSeconds: 900 },
  }) as never,
);
const guard = new JwtAuthGuard(new Reflector(), tokens);

const payload: JwtPayload = {
  sub: '0199c3a0-0000-7000-8000-000000000001',
  role: Role.ADMIN,
  clientId: null,
  sid: '0199c3a0-0000-7000-8000-0000000000aa',
  mcp: false,
};

class Routes {
  protectedRoute() {}
  @Public() publicRoute() {}
  @AllowPendingPasswordChange() changePasswordRoute() {}
}

function contextFor(handler: keyof Routes, authorization?: string) {
  const request: { headers: Record<string, string>; user?: JwtPayload } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    getHandler: () => Routes.prototype[handler],
    getClass: () => Routes,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  it('lets @Public() routes through without a token', async () => {
    await expect(guard.canActivate(contextFor('publicRoute').context)).resolves.toBe(true);
  });

  it('rejects a request without a token (401)', async () => {
    await expect(guard.canActivate(contextFor('protectedRoute').context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a non-Bearer authorization header (401)', async () => {
    const { context } = contextFor('protectedRoute', 'Basic dXNlcjpwYXNz');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid token (401)', async () => {
    const { context } = contextFor('protectedRoute', 'Bearer nope');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid token and puts its claims on request.user', async () => {
    const token = await tokens.signAccessToken(payload);
    const { context, request } = contextFor('protectedRoute', `Bearer ${token}`);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });

  describe('when the user must change their password', () => {
    it('blocks ordinary routes (403)', async () => {
      const token = await tokens.signAccessToken({ ...payload, mcp: true });
      const { context } = contextFor('protectedRoute', `Bearer ${token}`);
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows routes marked @AllowPendingPasswordChange()', async () => {
      const token = await tokens.signAccessToken({ ...payload, mcp: true });
      const { context } = contextFor('changePasswordRoute', `Bearer ${token}`);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });
});
