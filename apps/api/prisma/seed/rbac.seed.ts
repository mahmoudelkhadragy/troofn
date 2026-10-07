import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  PERMISSION_DEFINITIONS,
  RBAC_MATRIX,
  ROLE_DEFINITIONS,
  validateRbacMatrix,
} from '../../src/modules/access-control/rbac.matrix.js';

/**
 * Makes roles / permissions / role_permissions match rbac.matrix.ts exactly.
 * Idempotent and safe in every environment: it adds, updates and removes rows
 * until the tables equal the matrix.
 */
export async function seedRbac(prisma: PrismaClient): Promise<void> {
  const errors = validateRbacMatrix(RBAC_MATRIX);
  if (errors.length) throw new Error(`Invalid RBAC matrix:\n- ${errors.join('\n- ')}`);

  await prisma.$transaction(async (tx) => {
    // 1. Permissions: upsert the catalog, delete keys that no longer exist (cascades grants).
    const permissionIds = new Map<string, string>();
    for (const [key, { module, description }] of Object.entries(PERMISSION_DEFINITIONS)) {
      const permission = await tx.permission.upsert({
        where: { key },
        create: { key, module, description },
        update: { module, description },
      });
      permissionIds.set(key, permission.id);
    }
    await tx.permission.deleteMany({ where: { key: { notIn: [...permissionIds.keys()] } } });

    // 2. Roles, and for each role exactly the grants in the matrix.
    for (const [key, definition] of Object.entries(ROLE_DEFINITIONS)) {
      const role = await tx.role.upsert({
        where: { key },
        create: { key, ...definition },
        update: definition,
      });

      const grants = Object.entries(RBAC_MATRIX[key as keyof typeof RBAC_MATRIX]);
      const grantedIds = grants.map(([permission]) => permissionIds.get(permission)!);

      await tx.rolePermission.deleteMany({
        where: { roleId: role.id, permissionId: { notIn: grantedIds } },
      });
      for (const [permission, scope] of grants) {
        const permissionId = permissionIds.get(permission)!;
        await tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId } },
          create: { roleId: role.id, permissionId, scope },
          update: { scope },
        });
      }
    }
  });

  const [roles, permissions, grants] = await Promise.all([
    prisma.role.count(),
    prisma.permission.count(),
    prisma.rolePermission.count(),
  ]);
  console.log(`RBAC: ${roles} roles, ${permissions} permissions, ${grants} grants`);
}
