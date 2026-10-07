import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type JwtPayload, Permission, Role } from '@troofn/shared';
import { Authenticated, Public } from '../../../common/decorators/index.js';
import type { AccessContext } from '../access-context.js';
import { AccessControlService } from '../access-control.service.js';
import { RequirePermissions } from '../decorators/require-permissions.decorator.js';
import { PermissionsGuard } from './permissions.guard.js';

const grants = [
  { role: 'admin', permission: 'clients.read', scope: 'ALL' },
  { role: 'admin', permission: 'users.read', scope: 'ALL' },
  { role: 'client', permission: 'clients.read', scope: 'OWN_CLIENT' },
];
const access = new AccessControlService({
  rolePermission: {
    findMany: async () =>
      grants.map((g) => ({
        scope: g.scope,
        role: { key: g.role },
        permission: { key: g.permission },
      })),
  },
} as never);
const guard = new PermissionsGuard(new Reflector(), access);

class Routes {
  @RequirePermissions(Permission.CLIENTS_READ) readClients() {}
  @RequirePermissions(Permission.CLIENTS_READ, Permission.USERS_READ) readBoth() {}
  @Public() @RequirePermissions(Permission.USERS_READ) publicRoute() {}
  @Authenticated() anyAuthenticatedUser() {}
  forgotten() {}
}

function contextFor(handler: keyof Routes, user?: Partial<JwtPayload>) {
  const request: { user?: Partial<JwtPayload>; access?: AccessContext } = { user };
  const context = {
    getHandler: () => Routes.prototype[handler],
    getClass: () => Routes,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

const admin = { sub: 'u-admin', role: Role.ADMIN, clientId: null };
const owner = { sub: 'u-owner', role: Role.CLIENT, clientId: 'c-1' };
const employee = { sub: 'u-emp', role: Role.EMPLOYEE, clientId: null };

describe('PermissionsGuard', () => {
  it('allows a role that holds the permission and attaches the access context', async () => {
    const { context, request } = contextFor('readClients', owner);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.access).toEqual({
      userId: 'u-owner',
      role: Role.CLIENT,
      clientId: 'c-1',
      scope: 'OWN_CLIENT',
    });
  });

  it('denies a role without the permission (403)', async () => {
    const { context } = contextFor('readClients', employee);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires every listed permission', async () => {
    await expect(guard.canActivate(contextFor('readBoth', admin).context)).resolves.toBe(true);
    await expect(guard.canActivate(contextFor('readBoth', owner).context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lets routes without @RequirePermissions through for any signed-in user', async () => {
    await expect(
      guard.canActivate(contextFor('anyAuthenticatedUser', employee).context),
    ).resolves.toBe(true);
  });

  it('skips @Public() routes', async () => {
    await expect(guard.canActivate(contextFor('publicRoute').context)).resolves.toBe(true);
  });

  it('denies when there is no authenticated user (fails closed)', async () => {
    await expect(guard.canActivate(contextFor('readClients').context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
