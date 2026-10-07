import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Paginated } from '../../common/interceptors/transform-response.interceptor.js';
import { paginate } from '../../common/utils/index.js';
import { PrismaService } from '../../database/index.js';
import { Prisma } from '../../generated/prisma/client.js';
import { type AccessContext, userScopeWhere } from '../access-control/index.js';
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
  mustChangePassword: true,
  lastLoginAt: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { key: true, nameAr: true, nameEn: true, audience: true } },
  client: { select: { id: true, code: true, companyName: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
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
          mustChangePassword: dto.mustChangePassword ?? false,
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

    if (
      id === access.userId &&
      (dto.status === 'INACTIVE' || (dto.role && dto.role !== current.role.key))
    ) {
      throw new BadRequestException('You cannot deactivate yourself or change your own role');
    }

    // Validate the role/company pair the user will end up with.
    const nextRole = dto.role ?? current.role.key;
    const nextClientId = dto.clientId !== undefined ? dto.clientId : (current.client?.id ?? null);
    const roleId = await this.resolveRole(nextRole, nextClientId);
    if (dto.email && dto.email !== current.email) await this.assertUnique({ email: dto.email }, id);

    const updated = await this.mapUniqueViolation(() =>
      this.prisma.user.update({
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
      }),
    );

    // Old tokens carry the old role / company: end the sessions so the next login is fresh.
    const deactivated = dto.status === 'INACTIVE' && current.status !== 'INACTIVE';
    const accessChanged =
      nextRole !== current.role.key || nextClientId !== (current.client?.id ?? null);
    if (deactivated || accessChanged) await this.sessions.revokeAllForUser(id, 'USER_DEACTIVATED');

    return updated;
  }

  /** Sets a temporary password, unlocks the account and forces a change at next login. */
  async resetPassword(access: AccessContext, id: string, dto: ResetPasswordDto): Promise<void> {
    await this.findOne(access, id);
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(dto.newPassword),
        passwordChangedAt: new Date(),
        mustChangePassword: true,
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
