import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/index.js';
import type { RoleResponseDto } from './dto/role-response.dto.js';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ audience: 'desc' }, { key: 'asc' }],
      select: {
        key: true,
        nameAr: true,
        nameEn: true,
        audience: true,
        description: true,
        _count: { select: { users: { where: { deletedAt: null } } } },
        permissions: {
          orderBy: { permission: { key: 'asc' } },
          select: { scope: true, permission: { select: { key: true, module: true } } },
        },
      },
    });
    return roles.map(({ _count, permissions, ...role }) => ({
      ...role,
      userCount: _count.users,
      permissions: permissions.map(({ scope, permission }) => ({ ...permission, scope })),
    }));
  }
}
