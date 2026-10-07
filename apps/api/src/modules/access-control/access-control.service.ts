import { Injectable } from '@nestjs/common';
import type { Permission, PermissionScope } from '@troofn/shared';
import { PrismaService } from '../../database/index.js';

type GrantMap = Map<string, Map<string, PermissionScope>>;

/**
 * Answers "may role R do P, and on which rows?" from the role_permissions table.
 * Grants change rarely (only via the seed), so they are cached in memory for a minute
 * instead of being queried on every request.
 */
@Injectable()
export class AccessControlService {
  static readonly CACHE_TTL_MS = 60_000;

  private cache?: { loadedAt: number; grants: Promise<GrantMap> };

  constructor(private readonly prisma: PrismaService) {}

  async scopeFor(role: string, permission: Permission): Promise<PermissionScope | undefined> {
    return (await this.grants()).get(role)?.get(permission);
  }

  /** Drop the cache, e.g. after roles or grants are edited. */
  invalidate(): void {
    this.cache = undefined;
  }

  private grants(): Promise<GrantMap> {
    const now = Date.now();
    if (!this.cache || now - this.cache.loadedAt > AccessControlService.CACHE_TTL_MS) {
      const grants = this.load();
      this.cache = { loadedAt: now, grants };
      // A failed load must not stay cached.
      grants.catch(() => this.invalidate());
    }
    return this.cache.grants;
  }

  private async load(): Promise<GrantMap> {
    const rows = await this.prisma.rolePermission.findMany({
      select: {
        scope: true,
        role: { select: { key: true } },
        permission: { select: { key: true } },
      },
    });
    const map: GrantMap = new Map();
    for (const { role, permission, scope } of rows) {
      if (!map.has(role.key)) map.set(role.key, new Map());
      map.get(role.key)!.set(permission.key, scope as PermissionScope);
    }
    return map;
  }
}
