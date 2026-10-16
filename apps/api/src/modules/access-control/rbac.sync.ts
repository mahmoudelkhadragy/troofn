import type { PrismaClient } from '../../generated/prisma/client.js';
import {
  PERMISSION_DEFINITIONS,
  RBAC_MATRIX,
  ROLE_DEFINITIONS,
  validateRbacMatrix,
} from './rbac.matrix.js';

export interface RbacSyncResult {
  roles: number;
  permissions: number;
  grants: number;
}

/**
 * Makes roles / permissions / role_permissions match rbac.matrix.ts exactly.
 * Idempotent and safe in every environment: it adds, updates and removes rows
 * until the tables equal the matrix. Used by the API at startup and by `pnpm db:seed`.
 *
 * The transaction takes an advisory lock first, so two instances booting together
 * (or a deploy racing a seed) run one after the other instead of fighting over rows.
 */
export async function syncRbac(prisma: PrismaClient): Promise<RbacSyncResult> {
  const errors = validateRbacMatrix(RBAC_MATRIX);
  if (errors.length) throw new Error(`Invalid RBAC matrix:\n- ${errors.join('\n- ')}`);

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('rbac:sync'))`;

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

      const [roles, permissions, grants] = await Promise.all([
        tx.role.count(),
        tx.permission.count(),
        tx.rolePermission.count(),
      ]);
      return { roles, permissions, grants };
    },
    // ~400 sequential upserts, plus time spent waiting for the lock.
    { timeout: 60_000 },
  );
}
