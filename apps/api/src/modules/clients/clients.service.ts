import { Injectable, NotFoundException } from '@nestjs/common';
import type { Paginated } from '../../common/interceptors/transform-response.interceptor.js';
import { paginate } from '../../common/utils/index.js';
import { PrismaService } from '../../database/index.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { type AccessContext, clientScopeWhere } from '../access-control/index.js';
import type { ClientDetailDto, ClientsQueryDto, ClientSummaryDto } from './dto/index.js';

const summarySelect = {
  id: true,
  code: true,
  companyName: true,
  contactName: true,
  status: true,
  appAccessEnabled: true,
  sector: { select: { nameAr: true, nameEn: true } },
} satisfies Prisma.ClientSelect;

const detailSelect = {
  ...summarySelect,
  email: true,
  phone: true,
  website: true,
  legalRepresentative: true,
  driveUrl: true,
  contractStartDate: true,
  renewalPeriodMonths: true,
  team: {
    orderBy: { assignedAt: 'asc' },
    select: { teamRole: true, user: { select: { id: true, displayName: true } } },
  },
} satisfies Prisma.ClientSelect;

/**
 * Read-only for now (full client CRUD is the next phase). Every query is wrapped in
 * clientScopeWhere(access), so the same code returns all clients to an admin, the
 * assigned ones to a marketing manager, and only their own company to a client user.
 */
@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    access: AccessContext,
    query: ClientsQueryDto,
  ): Promise<Paginated<ClientSummaryDto>> {
    const where: Prisma.ClientWhereInput = {
      AND: [
        clientScopeWhere(access),
        { deletedAt: null },
        query.status ? { status: query.status } : {},
        query.search
          ? {
              OR: [
                { companyName: { contains: query.search, mode: 'insensitive' } },
                { contactName: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        select: summarySelect,
        orderBy: { companyName: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.client.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async findOne(access: AccessContext, id: string): Promise<ClientDetailDto> {
    const client = await this.prisma.client.findFirst({
      where: { AND: [{ id, deletedAt: null }, clientScopeWhere(access)] },
      select: detailSelect,
    });
    // Out of scope and non-existent look the same (404), so ids can't be probed.
    if (!client) throw new NotFoundException('Client not found');

    const { team, ...rest } = client;
    return {
      ...rest,
      team: team.map(({ teamRole, user }) => ({
        userId: user.id,
        displayName: user.displayName,
        teamRole,
      })),
    };
  }
}
