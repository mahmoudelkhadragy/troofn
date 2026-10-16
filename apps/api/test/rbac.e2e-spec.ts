import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/database/index.js';
import { createTestApp, login } from './helpers/app.js';

/**
 * Authorization end to end: the same endpoints called by every seeded role.
 * Expected results are the "Shows" column of the seed table in
 * docs/plans/stage-1-auth-rbac.md §6.
 */
describe('RBAC (e2e)', () => {
  let app: INestApplication<App>;
  const tokens: Record<string, string> = {};
  const clientIds: Record<string, string> = {};
  const users = [
    'owner',
    'admin',
    'fahad.mm',
    'abdullah.writer',
    'ahmed.employee',
    'wejnad.owner',
    'wejnad.marketing',
    'wejnad.accountant',
    'jabr.owner',
  ];
  /** Everyone except the two dashboard roles. */
  const staffAndClients = users.filter((u) => u !== 'owner' && u !== 'admin');

  const get = (path: string, username: string) =>
    request(app.getHttpServer())
      .get(`/api/v1${path}`)
      .set('Authorization', `Bearer ${tokens[username]}`);

  beforeAll(async () => {
    app = await createTestApp();
    for (const username of users) tokens[username] = (await login(app, username)).accessToken;
    for (const c of await app
      .get(PrismaService)
      .client.findMany({ select: { id: true, code: true } })) {
      clientIds[c.code] = c.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /roles (roles.read)', () => {
    it.each(['owner', 'admin'])(
      '%s sees all 8 roles with their permissions and scopes',
      async (username) => {
        const res = await get('/roles', username).expect(200);
        expect(res.body.data).toHaveLength(8);
        const accountant = res.body.data.find(
          (r: { key: string }) => r.key === 'client_accountant',
        );
        expect(accountant).toMatchObject({ audience: 'CLIENT', nameAr: 'مدير الحسابات' });
        expect(accountant.permissions).toContainEqual({
          key: 'invoices.read',
          module: 'invoices',
          scope: 'OWN_CLIENT',
        });
      },
    );

    it.each(staffAndClients)('%s is refused (403)', async (username) => {
      const res = await get('/roles', username).expect(403);
      expect(res.body.error.message).toBe('You do not have permission to perform this action');
    });

    it('requires a token (401)', async () => {
      await request(app.getHttpServer()).get('/api/v1/roles').expect(401);
    });
  });

  describe('GET /clients (clients.read, scoped)', () => {
    const WEJNAD = 'TID00S1W';
    const JABR = 'TID00S2J';
    const NUKHBA = 'TID00S3N';
    const codes = (body: { data: { code: string }[] }) => body.data.map((c) => c.code).sort();

    it.each([
      ['owner', [WEJNAD, JABR, NUKHBA]], // ALL
      ['admin', [WEJNAD, JABR, NUKHBA]], // ALL
      ['fahad.mm', [WEJNAD, JABR]], // ASSIGNED: his team only
      ['wejnad.owner', [WEJNAD]], // OWN_CLIENT
      ['wejnad.marketing', [WEJNAD]],
      ['wejnad.accountant', [WEJNAD]],
      ['jabr.owner', [JABR]],
    ])('%s sees %j', async (username, expected) => {
      const res = await get('/clients', username).expect(200);
      expect(codes(res.body)).toEqual([...expected].sort());
      expect(res.body.meta).toMatchObject({ page: 1, total: expected.length });
    });

    it.each(['abdullah.writer', 'ahmed.employee'])(
      '%s has no clients.read (403)',
      async (username) => {
        await get('/clients', username).expect(403);
      },
    );

    it('filters by status and search on top of the scope', async () => {
      const inactive = await get('/clients?status=INACTIVE', 'admin').expect(200);
      expect(codes(inactive.body)).toEqual([NUKHBA]);
      const search = await get(`/clients?search=${encodeURIComponent('وجناد')}`, 'fahad.mm').expect(
        200,
      );
      expect(codes(search.body)).toEqual([WEJNAD]);
    });
  });

  describe('GET /clients/:id (404 outside the scope)', () => {
    it.each([
      ['fahad.mm', 'TID00S1W', 200],
      ['fahad.mm', 'TID00S3N', 404], // not on his team
      ['wejnad.owner', 'TID00S1W', 200],
      ['wejnad.owner', 'TID00S2J', 404], // another company
      ['jabr.owner', 'TID00S1W', 404],
      ['admin', 'TID00S3N', 200],
    ])('%s → %s → %i', async (username, code, status) => {
      await get(`/clients/${clientIds[code]}`, username).expect(status);
    });

    it('returns the profile with its team', async () => {
      const res = await get(`/clients/${clientIds.TID00S1W}`, 'wejnad.owner').expect(200);
      expect(res.body.data).toMatchObject({ code: 'TID00S1W', sector: { nameEn: 'Real estate' } });
      expect(res.body.data.team).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ displayName: 'فهد القحطاني', teamRole: 'MARKETING_MANAGER' }),
          expect.objectContaining({ displayName: 'عبدالله السعيد', teamRole: 'EXECUTION' }),
        ]),
      );
    });

    it('404 for an unknown id, 400 for a malformed one', async () => {
      await get('/clients/0199c3a0-0000-7000-8000-000000000000', 'admin').expect(404);
      await get('/clients/not-a-uuid', 'admin').expect(400);
    });
  });

  describe('/users (owner and admin only)', () => {
    it.each(['owner', 'admin'])('%s lists all seeded users', async (username) => {
      const res = await get('/users?limit=100', username).expect(200);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(10);
    });

    it.each(staffAndClients)('%s is refused (403)', async (username) => {
      await get('/users', username).expect(403);
    });
  });

  describe("setting another user's password (owner and admin only)", () => {
    const send = (method: 'post' | 'patch', path: string, username: string, body: object) =>
      request(app.getHttpServer())
        [method](`/api/v1${path}`)
        .set('Authorization', `Bearer ${tokens[username]}`)
        .send(body);
    const unknownId = '0199c3a0-0000-7000-8000-000000000000';
    let employeeId: string;

    beforeAll(async () => {
      employeeId = (
        await app
          .get(PrismaService)
          .user.findUniqueOrThrow({ where: { username: 'ahmed.employee' } })
      ).id;
    });

    it.each(staffAndClients)('%s cannot reset a password (403)', async (username) => {
      await send('post', `/users/${employeeId}/reset-password`, username, {
        newPassword: 'Hijack-pass-123',
      }).expect(403);
    });

    it.each(staffAndClients)('%s cannot create a user with a password (403)', async (username) => {
      await send('post', '/users', username, {
        username: 'e2e.rbac.pw',
        displayName: 'x',
        role: 'employee',
        password: 'Hijack-pass-123',
      }).expect(403);
    });

    // An unknown id gets past the permission check (404, not 403) without changing any password.
    it.each(['owner', 'admin'])('%s holds users.reset_password', async (username) => {
      await send('post', `/users/${unknownId}/reset-password`, username, {
        newPassword: 'Temp-pass-123',
      }).expect(404);
    });

    it('PATCH /users/:id never accepts a password (400)', async () => {
      await send('patch', `/users/${employeeId}`, 'owner', { password: 'Hijack-pass-123' }).expect(
        400,
      );
    });
  });
});
