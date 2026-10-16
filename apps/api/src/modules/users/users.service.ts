import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Permission, Role } from '@troofn/shared';
import type { Paginated } from '../../common/interceptors/transform-response.interceptor.js';
import { paginate } from '../../common/utils/index.js';
import { PrismaService } from '../../database/index.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  type AccessContext,
  AccessControlService,
  userScopeWhere,
} from '../access-control/index.js';
import { hashPassword } from '../auth/password.js';
import { SessionsService } from '../auth/sessions.service.js';
import type {
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UserResponseDto,
  UsersQueryDto,
} from './dto/index.js';

/** The columns a user response is made of. Password and token hashes are never selected. */
const userSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  phone: true,
  status: true,
  lastLoginAt: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { key: true, nameAr: true, nameEn: true, audience: true } },
  client: { select: { id: true, code: true, companyName: true } },
} satisfies Prisma.UserSelect;

/** Accounts only a holder of users.manage_admins (the owner) may create, edit or reset. */
const PROTECTED_ROLES: readonly string[] = [Role.OWNER, Role.ADMIN];

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly accessControl: AccessControlService,
  ) {}

  async findAll(access: AccessContext, query: UsersQueryDto): Promise<Paginated<UserResponseDto>> {
    const where: Prisma.UserWhereInput = {
      AND: [
        userScopeWhere(access),
        { deletedAt: null },
        query.role ? { role: { key: query.role } } : {},
        query.status ? { status: query.status } : {},
        query.clientId ? { clientId: query.clientId } : {},
        query.search
          ? {
              OR: [
                { username: { contains: query.search, mode: 'insensitive' } },
                { displayName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async findOne(access: AccessContext, id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { AND: [{ id, deletedAt: null }, userScopeWhere(access)] },
      select: userSelect,
    });
    // Outside the caller's scope looks exactly like "doesn't exist": ids can't be probed.
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(access: AccessContext, dto: CreateUserDto): Promise<UserResponseDto> {
    await this.assertCanManage(access, [dto.role]);
    const roleId = await this.resolveRole(dto.role, dto.clientId ?? null);
    await this.assertUnique({ username: dto.username, email: dto.email });
    const passwordHash = await hashPassword(dto.password);

    return this.mapUniqueViolation(() =>
      this.prisma.user.create({
        data: {
          username: dto.username,
          displayName: dto.displayName,
          email: dto.email,
          phone: dto.phone,
          status: dto.status ?? 'ACTIVE',
          passwordHash,
          roleId,
          clientId: dto.clientId ?? null,
          createdById: access.userId,
        },
        select: userSelect,
      }),
    );
  }

  async update(access: AccessContext, id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const current = await this.findOne(access, id);
    const nextRole = dto.role ?? current.role.key;
    // Editing your own profile is allowed; the self-check below still blocks your own role and status.
    if (id !== access.userId) await this.assertCanManage(access, [current.role.key, nextRole]);

    if (
      id === access.userId &&
      (dto.status === 'INACTIVE' || (dto.role && dto.role !== current.role.key))
    ) {
      throw new BadRequestException('You cannot deactivate yourself or change your own role');
    }

    const nextClientId = dto.clientId !== undefined ? dto.clientId : (current.client?.id ?? null);
    const roleId = await this.resolveRole(nextRole, nextClientId);
    if (dto.email && dto.email !== current.email) await this.assertUnique({ email: dto.email }, id);

    const losesActiveOwner =
      current.role.key === Role.OWNER &&
      current.status === 'ACTIVE' &&
      (dto.status === 'INACTIVE' || nextRole !== Role.OWNER);

    const updated = await this.mapUniqueViolation(() =>
      this.prisma.$transaction(async (tx) => {
        if (losesActiveOwner) await this.assertNotLastOwner(tx, id);
        return tx.user.update({
          where: { id },
          data: {
            displayName: dto.displayName,
            email: dto.email,
            phone: dto.phone,
            status: dto.status,
            roleId,
            clientId: nextClientId,
          },
          select: userSelect,
        });
      }),
    );

    // Old tokens carry the old role / company: end the sessions so the next login is fresh.
    const deactivated = dto.status === 'INACTIVE' && current.status !== 'INACTIVE';
    const accessChanged =
      nextRole !== current.role.key || nextClientId !== (current.client?.id ?? null);
    if (deactivated || accessChanged) {
      await this.sessions.revokeAllForUser(id, deactivated ? 'USER_DEACTIVATED' : 'ACCESS_CHANGED');
    }

    return updated;
  }

  /**
   * Sets the user's password, unlocks the account and ends their sessions. Users cannot change
   * their own password, so this (and create) is the only place a password is ever written.
   */
  async resetPassword(access: AccessContext, id: string, dto: ResetPasswordDto): Promise<void> {
    const user = await this.findOne(access, id);
    await this.assertCanManage(access, [user.role.key]);
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(dto.newPassword),
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await this.sessions.revokeAllForUser(id, 'PASSWORD_RESET');
  }

  /**
   * Client roles must belong to an existing, non-deleted client; staff roles to none.
   * Returns the role id.
   */
  private async resolveRole(roleKey: string, clientId: string | null): Promise<string> {
    const role = await this.prisma.role.findUnique({
      where: { key: roleKey },
      select: { id: true, audience: true },
    });
    if (!role) throw new BadRequestException(`Unknown role: ${roleKey}`);

    if (role.audience === 'CLIENT') {
      if (!clientId) throw new BadRequestException('Client roles require a clientId');
      const client = await this.prisma.client.findFirst({
        where: { id: clientId, deletedAt: null },
        select: { id: true },
      });
      if (!client) throw new BadRequestException('Client not found');
    } else if (clientId) {
      throw new BadRequestException('Staff roles cannot belong to a client');
    }
    return role.id;
  }

  /** 403 unless the caller holds users.manage_admins whenever an owner or admin account is involved. */
  private async assertCanManage(access: AccessContext, roleKeys: string[]): Promise<void> {
    if (!roleKeys.some((key) => PROTECTED_ROLES.includes(key))) return;
    const scope = await this.accessControl.scopeFor(access.role, Permission.USERS_MANAGE_ADMINS);
    if (scope === undefined) {
      throw new ForbiddenException('Only an owner can manage owner and admin accounts');
    }
  }

  /**
   * 409 if `ownerId` is the last active owner. The advisory lock queues concurrent owner
   * removals so each one sees the other's committed result instead of both passing.
   */
  private async assertNotLastOwner(tx: Prisma.TransactionClient, ownerId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('users:last-owner'))`;
    const others = await tx.user.count({
      where: { id: { not: ownerId }, role: { key: Role.OWNER }, status: 'ACTIVE', deletedAt: null },
    });
    if (others === 0) throw new ConflictException('The system must keep at least one active owner');
  }

  private async assertUnique(
    fields: { username?: string; email?: string },
    exceptId?: string,
  ): Promise<void> {
    const or: Prisma.UserWhereInput[] = [];
    if (fields.username) or.push({ username: fields.username });
    if (fields.email) or.push({ email: fields.email });
    if (!or.length) return;
    const taken = await this.prisma.user.findFirst({
      where: { OR: or, ...(exceptId && { id: { not: exceptId } }) },
      select: { username: true, email: true },
    });
    if (taken?.username === fields.username)
      throw new ConflictException('Username is already taken');
    if (taken) throw new ConflictException('Email is already in use');
  }

  /** The pre-checks above give clear messages; this catches the race where two requests collide. */
  private async mapUniqueViolation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Username or email is already in use');
      }
      throw error;
    }
  }
}
