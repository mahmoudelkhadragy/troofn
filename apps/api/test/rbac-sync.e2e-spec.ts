import { PrismaService } from '../src/database/index.js';
import { PERMISSION_DEFINITIONS, RBAC_MATRIX } from '../src/modules/access-control/rbac.matrix.js';
import { syncRbac } from '../src/modules/access-control/rbac.sync.js';
import { createTestApp } from './helpers/app.js';

/** syncRbac() is what the API runs at startup: it must repair any drift from rbac.matrix.ts. */
describe('RBAC sync (e2e)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService;

  const expectedGrants = Object.values(RBAC_MATRIX).reduce(
    (sum, grants) => sum + Object.keys(grants).length,
    0,
  );

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await syncRbac(prisma); // leave the shared database as the matrix defines it
    await app.close();
  });

  it('reports the matrix totals and changes nothing when already in sync', async () => {
    const result = await syncRbac(prisma);
    expect(result).toEqual({
      roles: Object.keys(RBAC_MATRIX).length,
      permissions: Object.keys(PERMISSION_DEFINITIONS).length,
      grants: expectedGrants,
    });
    expect(await syncRbac(prisma)).toEqual(result);
  });

  it('restores a missing grant, a changed scope and removes a stray grant and permission', async () => {
    const owner = await prisma.role.findUniqueOrThrow({ where: { key: 'owner' } });
    const manager = await prisma.role.findUniqueOrThrow({ where: { key: 'marketing_manager' } });
    const dashboard = await prisma.permission.findUniqueOrThrow({
      where: { key: 'app.dashboard' },
    });
    const clientsRead = await prisma.permission.findUniqueOrThrow({
      where: { key: 'clients.read' },
    });

    // Drift: the owner lost the dashboard, the manager's scope was widened, and an
    // unknown permission was granted to the manager.
    await prisma.rolePermission.deleteMany({
      where: { roleId: owner.id, permissionId: dashboard.id },
    });
    await prisma.rolePermission.update({
      where: { roleId_permissionId: { roleId: manager.id, permissionId: clientsRead.id } },
      data: { scope: 'ALL' },
    });
    const stray = await prisma.permission.create({
      data: { key: 'legacy.stray', module: 'legacy', description: 'removed from the matrix' },
    });
    await prisma.rolePermission.create({
      data: { roleId: manager.id, permissionId: stray.id, scope: 'ALL' },
    });

    await syncRbac(prisma);

    const grant = (roleId: string, permissionId: string) =>
      prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId, permissionId } },
      });
    expect(await grant(owner.id, dashboard.id)).not.toBeNull();
    expect((await grant(manager.id, clientsRead.id))?.scope).toBe('ASSIGNED');
    expect(await prisma.permission.findUnique({ where: { key: 'legacy.stray' } })).toBeNull();
    expect(await grant(manager.id, stray.id)).toBeNull();
  });

  it('serialises concurrent runs (two instances booting together)', async () => {
    const results = await Promise.all([syncRbac(prisma), syncRbac(prisma), syncRbac(prisma)]);
    for (const result of results) expect(result.grants).toBe(expectedGrants);
  });
});
