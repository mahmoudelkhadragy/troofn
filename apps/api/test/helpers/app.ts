import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/database/index.js';
import { hashPassword } from '../../src/modules/auth/password.js';
import { configureApp } from '../../src/main.js';

/** Password of every seeded demo user (apps/api/.env → SEED_DEFAULT_PASSWORD). */
export const DEMO_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? '';

export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

export async function login(
  app: INestApplication<App>,
  username: string,
  password = DEMO_PASSWORD,
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username, password })
    .expect(200);
  return res.body.data;
}

/**
 * Creates a throw-away user for tests that change a user's state (lockout,
 * password change, deactivation), so the seeded demo users stay untouched.
 * Usernames start with "e2e." and are removed by deleteTestUsers().
 */
export async function createTestUser(
  app: INestApplication<App>,
  overrides: {
    username: string;
    role?: string;
    clientCode?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    mustChangePassword?: boolean;
    password?: string;
  },
): Promise<{ id: string; username: string }> {
  const prisma = app.get(PrismaService);
  const role = await prisma.role.findUniqueOrThrow({
    where: { key: overrides.role ?? 'employee' },
  });
  const client = overrides.clientCode
    ? await prisma.client.findUniqueOrThrow({ where: { code: overrides.clientCode } })
    : null;
  return prisma.user.create({
    data: {
      username: overrides.username,
      displayName: overrides.username,
      passwordHash: await hashPassword(overrides.password ?? DEMO_PASSWORD),
      roleId: role.id,
      clientId: client?.id ?? null,
      status: overrides.status ?? 'ACTIVE',
      mustChangePassword: overrides.mustChangePassword ?? false,
    },
    select: { id: true, username: true },
  });
}

export async function deleteTestUsers(app: INestApplication<App>): Promise<void> {
  await app.get(PrismaService).user.deleteMany({ where: { username: { startsWith: 'e2e.' } } });
}
