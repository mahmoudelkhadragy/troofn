import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp, login } from './helpers/app.js';

/**
 * Authorization end to end: the same endpoints called by every seeded role.
 * Expected results are the "Shows" column of the seed table in
 * docs/plans/stage-1-auth-rbac.md §6.
 */
describe('RBAC (e2e)', () => {
  let app: INestApplication<App>;
  const tokens: Record<string, string> = {};
  const users = [
    'admin',
    'fahad.mm',
    'abdullah.writer',
    'ahmed.employee',
    'wejnad.owner',
    'wejnad.marketing',
    'wejnad.accountant',
    'jabr.owner',
  ];

  const get = (path: string, username: string) =>
    request(app.getHttpServer())
      .get(`/api/v1${path}`)
      .set('Authorization', `Bearer ${tokens[username]}`);

  beforeAll(async () => {
    app = await createTestApp();
    for (const username of users) tokens[username] = (await login(app, username)).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /roles (roles.read)', () => {
    it('admin sees all 7 roles with their permissions and scopes', async () => {
      const res = await get('/roles', 'admin').expect(200);
      expect(res.body.data).toHaveLength(7);
      const accountant = res.body.data.find((r: { key: string }) => r.key === 'client_accountant');
      expect(accountant).toMatchObject({ audience: 'CLIENT', nameAr: 'مدير الحسابات' });
      expect(accountant.permissions).toContainEqual({
        key: 'invoices.read',
        module: 'invoices',
        scope: 'OWN_CLIENT',
      });
    });

    it.each(users.filter((u) => u !== 'admin'))('%s is refused (403)', async (username) => {
      const res = await get('/roles', username).expect(403);
      expect(res.body.error.message).toBe('You do not have permission to perform this action');
    });

    it('requires a token (401)', async () => {
      await request(app.getHttpServer()).get('/api/v1/roles').expect(401);
    });
  });
});
