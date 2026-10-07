import { Role } from '@troofn/shared';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import type { ClientTeamRole } from '../../src/generated/prisma/enums.js';
import { hashPassword } from '../../src/modules/auth/password.js';

/**
 * Demo data for local development and tests (never runs in production).
 * The three companies come from the Figma sidebar; there is one user per role,
 * plus two extra client users to show company isolation and inactive clients.
 * Every demo user's password is SEED_DEFAULT_PASSWORD (see .env.example).
 */

const SECTORS = [
  { nameAr: 'عقارات', nameEn: 'Real estate' },
  { nameAr: 'سيارات', nameEn: 'Automotive' },
  { nameAr: 'استشارات', nameEn: 'Consulting' },
];

const CLIENTS = [
  {
    code: 'TID00S1W',
    companyName: 'شركة وجناد العقارية',
    contactName: 'معاذ ذياب الصوغ',
    email: 'info@wejnad.sa',
    phone: '+966558500024',
    website: 'https://wejnad.sa',
    sector: 'عقارات',
    legalRepresentative: 'معاذ ذياب الصوغ',
    driveUrl: 'https://drive.google.com/',
    contractStartDate: new Date('2025-06-01'),
    renewalPeriodMonths: 3,
    appAccessEnabled: true,
    status: 'ACTIVE',
  },
  {
    code: 'TID00S2J',
    companyName: 'شركة الجبر للسيارات',
    contactName: 'خالد الجبر',
    email: 'info@aljabr.sa',
    phone: '+966551110002',
    website: 'https://aljabr.sa',
    sector: 'سيارات',
    legalRepresentative: 'خالد الجبر',
    driveUrl: null,
    contractStartDate: new Date('2025-09-01'),
    renewalPeriodMonths: 6,
    appAccessEnabled: true,
    status: 'ACTIVE',
  },
  {
    code: 'TID00S3N',
    companyName: 'شركة النخبة للاستشارات',
    contactName: 'سلمان النخبة',
    email: 'info@alnukhba.sa',
    phone: '+966551110003',
    website: 'https://alnukhba.sa',
    sector: 'استشارات',
    legalRepresentative: 'سلمان النخبة',
    driveUrl: null,
    contractStartDate: new Date('2024-01-01'),
    renewalPeriodMonths: 12,
    appAccessEnabled: true,
    status: 'INACTIVE', // the red dot in the Figma sidebar
  },
] as const;

interface DemoUser {
  username: string;
  displayName: string;
  email: string | null;
  role: Role;
  clientCode?: string;
  /** Staff only: the clients this user works on, and as what. */
  teams?: { clientCode: string; teamRole: ClientTeamRole }[];
}

const USERS: DemoUser[] = [
  { username: 'admin', displayName: 'Troofn Admin', email: 'admin@troofn.com', role: Role.ADMIN },
  {
    username: 'fahad.mm',
    displayName: 'فهد القحطاني',
    email: 'fahad@troofn.com',
    role: Role.MARKETING_MANAGER,
    teams: [
      { clientCode: 'TID00S1W', teamRole: 'MARKETING_MANAGER' },
      { clientCode: 'TID00S2J', teamRole: 'MARKETING_MANAGER' },
    ],
  },
  {
    username: 'abdullah.writer',
    displayName: 'عبدالله السعيد',
    email: 'abdullah@troofn.com',
    role: Role.CONTENT_WRITER,
    teams: [{ clientCode: 'TID00S1W', teamRole: 'EXECUTION' }],
  },
  {
    username: 'ahmed.employee',
    displayName: 'أحمد الشمري',
    email: 'ahmed@troofn.com',
    role: Role.EMPLOYEE,
  },
  {
    username: 'wejnad.owner',
    displayName: 'معاذ ذياب الصوغ',
    email: null,
    role: Role.CLIENT,
    clientCode: 'TID00S1W',
  },
  {
    username: 'wejnad.marketing',
    displayName: 'مسؤول تسويق وجناد',
    email: null,
    role: Role.CLIENT_MARKETING_OFFICER,
    clientCode: 'TID00S1W',
  },
  {
    username: 'wejnad.accountant',
    displayName: 'محاسب وجناد',
    email: null,
    role: Role.CLIENT_ACCOUNTANT,
    clientCode: 'TID00S1W',
  },
  {
    username: 'jabr.owner',
    displayName: 'خالد الجبر',
    email: null,
    role: Role.CLIENT,
    clientCode: 'TID00S2J',
  },
  {
    username: 'nukhba.owner',
    displayName: 'سلمان النخبة',
    email: null,
    role: Role.CLIENT,
    clientCode: 'TID00S3N',
  },
];

export async function seedDemoData(prisma: PrismaClient, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);

  const sectorIds = new Map<string, string>();
  for (const sector of SECTORS) {
    const row = await prisma.sector.upsert({
      where: { nameAr: sector.nameAr },
      create: sector,
      update: { nameEn: sector.nameEn },
    });
    sectorIds.set(sector.nameAr, row.id);
  }

  const clientIds = new Map<string, string>();
  for (const { sector, ...client } of CLIENTS) {
    const data = { ...client, sectorId: sectorIds.get(sector)! };
    const row = await prisma.client.upsert({
      where: { code: client.code },
      create: data,
      update: data,
    });
    clientIds.set(client.code, row.id);
  }

  const roleIds = new Map(
    (await prisma.role.findMany({ select: { id: true, key: true } })).map((r) => [r.key, r.id]),
  );

  for (const { teams = [], clientCode, role, ...user } of USERS) {
    // Re-seeding resets demo users to the known password and an unlocked, active state.
    const data = {
      ...user,
      roleId: roleIds.get(role)!,
      clientId: clientCode ? clientIds.get(clientCode)! : null,
      passwordHash,
      status: 'ACTIVE' as const,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      deletedAt: null,
    };
    const row = await prisma.user.upsert({
      where: { username: user.username },
      create: data,
      update: data,
    });

    for (const { clientCode: teamClient, teamRole } of teams) {
      const clientId = clientIds.get(teamClient)!;
      await prisma.clientTeamMember.upsert({
        where: { clientId_userId: { clientId, userId: row.id } },
        create: { clientId, userId: row.id, teamRole },
        update: { teamRole },
      });
    }
  }

  console.log(`Demo: ${SECTORS.length} sectors, ${CLIENTS.length} clients, ${USERS.length} users`);
}
