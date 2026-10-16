import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/database/index.js';
import { createTestApp, deleteTestUsers, login } from './helpers/app.js';

describe('Users admin (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let ownerToken: string;
  let adminId: string;
  let wejnadId: string;
  const http = () => request(app.getHttpServer());
  const asAdmin = (req: request.Test) => req.set('Authorization', `Bearer ${adminToken}`);
  const asOwner = (req: request.Test) => req.set('Authorization', `Bearer ${ownerToken}`);

  const newStaffUser = (username: string, role = 'employee') => ({
    username,
    displayName: 'Test staff user',
    role,
    password: 'Temp-pass-123',
  });

  const newClientUser = (username: string) => ({
    username,
    displayName: 'Test client user',
    role: 'client_marketing_officer',
    clientId: wejnadId,
    password: 'Temp-pass-123',
  });

  beforeAll(async () => {
    app = await createTestApp();
    await deleteTestUsers(app);
    const prisma = app.get(PrismaService);
    wejnadId = (await prisma.client.findUniqueOrThrow({ where: { code: 'TID00S1W' } })).id;
    adminId = (await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } })).id;
    adminToken = (await login(app, 'admin')).accessToken;
    ownerToken = (await login(app, 'owner')).accessToken;
  });

  afterAll(async () => {
    await deleteTestUsers(app);
    await app.close();
  });

  describe('POST /users', () => {
    it('creates a client login that can sign in and sees only its company', async () => {
      const res = await asAdmin(http().post('/api/v1/users'))
        .send({ ...newClientUser('E2E.Created'), email: 'E2E.Created@Wejnad.sa' })
        .expect(201);
      expect(res.body.data).toMatchObject({
        username: 'e2e.created', // normalized to lowercase
        email: 'e2e.created@wejnad.sa',
        role: { key: 'client_marketing_officer', audience: 'CLIENT' },
        client: { code: 'TID00S1W' },
        status: 'ACTIVE',
      });
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$argon2/);

      const { accessToken } = await login(app, 'e2e.created', 'Temp-pass-123');
      const clients = await http()
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(clients.body.data.map((c: { code: string }) => c.code)).toEqual(['TID00S1W']);
    });

    it('rejects a client role without a client (400)', async () => {
      const { clientId: _omit, ...body } = newClientUser('e2e.noclient');
      const res = await asAdmin(http().post('/api/v1/users')).send(body).expect(400);
      expect(res.body.error.message).toBe('Client roles require a clientId');
    });

    it('rejects a staff role attached to a client (400)', async () => {
      const res = await asAdmin(http().post('/api/v1/users'))
        .send({ ...newClientUser('e2e.staffclient'), role: 'employee' })
        .expect(400);
      expect(res.body.error.message).toBe('Staff roles cannot belong to a client');
    });

    it('rejects a duplicate username, whatever its case (409)', async () => {
      await asAdmin(http().post('/api/v1/users')).send(newClientUser('e2e.dup')).expect(201);
      await asAdmin(http().post('/api/v1/users')).send(newClientUser('E2E.DUP')).expect(409);
    });

    it('validates the body: weak password, bad username (400)', async () => {
      await asAdmin(http().post('/api/v1/users'))
        .send({ ...newClientUser('e2e.weak'), password: 'short' })
        .expect(400);
      await asAdmin(http().post('/api/v1/users')).send(newClientUser('e2e has spaces')).expect(400);
    });
  });

  describe('PATCH /users/:id', () => {
    it('deactivating a user ends their sessions and blocks login', async () => {
      const created = await asAdmin(http().post('/api/v1/users'))
        .send(newClientUser('e2e.deactivate'))
        .expect(201);
      const session = await login(app, 'e2e.deactivate', 'Temp-pass-123');

      await asAdmin(http().patch(`/api/v1/users/${created.body.data.id}`))
        .send({ status: 'INACTIVE' })
        .expect(200);

      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
      await http()
        .post('/api/v1/auth/login')
        .send({ username: 'e2e.deactivate', password: 'Temp-pass-123', app: 'MOBILE' })
        .expect(403);
    });

    it('re-validates the role/client pair (400)', async () => {
      const created = await asAdmin(http().post('/api/v1/users'))
        .send(newClientUser('e2e.rolechange'))
        .expect(201);
      // Becoming staff while still attached to a client is refused…
      await asAdmin(http().patch(`/api/v1/users/${created.body.data.id}`))
        .send({ role: 'employee' })
        .expect(400);
      // …but works when the client is cleared at the same time.
      const res = await asAdmin(http().patch(`/api/v1/users/${created.body.data.id}`))
        .send({ role: 'employee', clientId: null })
        .expect(200);
      expect(res.body.data).toMatchObject({ role: { key: 'employee' }, client: null });
    });

    it('an admin cannot deactivate themselves or change their own role (400)', async () => {
      await asAdmin(http().patch(`/api/v1/users/${adminId}`))
        .send({ status: 'INACTIVE' })
        .expect(400);
      await asAdmin(http().patch(`/api/v1/users/${adminId}`))
        .send({ role: 'employee' })
        .expect(400);
    });

    it('404 for an unknown user', async () => {
      await asAdmin(http().patch('/api/v1/users/0199c3a0-0000-7000-8000-000000000000'))
        .send({ displayName: 'x' })
        .expect(404);
    });
  });

  describe('POST /users/:id/reset-password', () => {
    it('sets the new password, ends sessions and works at once (no forced change)', async () => {
      const created = await asAdmin(http().post('/api/v1/users'))
        .send(newClientUser('e2e.reset.pw'))
        .expect(201);
      const before = await login(app, 'e2e.reset.pw', 'Temp-pass-123');

      await asAdmin(http().post(`/api/v1/users/${created.body.data.id}/reset-password`))
        .send({ newPassword: 'Another-temp-9' })
        .expect(204);

      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: before.refreshToken })
        .expect(401);
      // The old password is dead…
      await http()
        .post('/api/v1/auth/login')
        .send({ username: 'e2e.reset.pw', password: 'Temp-pass-123', app: 'MOBILE' })
        .expect(401);
      // …and the new one gives a normal session: nothing is blocked until the user "changes" it.
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ username: 'e2e.reset.pw', password: 'Another-temp-9', app: 'MOBILE' })
        .expect(200);
      await http()
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${res.body.data.accessToken}`)
        .expect(200);
    });
  });

  describe('owner and admin accounts (users.manage_admins)', () => {
    const create = (as: typeof asAdmin, body: object) =>
      as(http().post('/api/v1/users')).send(body);
    const createAsOwner = async (username: string, role: string) =>
      (await create(asOwner, newStaffUser(username, role)).expect(201)).body.data.id as string;

    it.each(['admin', 'owner'])('admin cannot create a %s account (403)', async (role) => {
      const res = await create(asAdmin, newStaffUser(`e2e.make.${role}`, role)).expect(403);
      expect(res.body.error.message).toBe('Only an owner can manage owner and admin accounts');
    });

    it('admin cannot promote an employee to admin (403)', async () => {
      const id = (await create(asAdmin, newStaffUser('e2e.promote')).expect(201)).body.data.id;
      await asAdmin(http().patch(`/api/v1/users/${id}`))
        .send({ role: 'admin' })
        .expect(403);
    });

    it('admin cannot edit, deactivate or demote another admin (403)', async () => {
      const id = await createAsOwner('e2e.other.admin', 'admin');
      for (const body of [{ displayName: 'x' }, { status: 'INACTIVE' }, { role: 'employee' }]) {
        await asAdmin(http().patch(`/api/v1/users/${id}`))
          .send(body)
          .expect(403);
      }
    });

    it("admin cannot reset the owner's password (403)", async () => {
      const prisma = app.get(PrismaService);
      const owner = await prisma.user.findUniqueOrThrow({ where: { username: 'owner' } });
      await asAdmin(http().post(`/api/v1/users/${owner.id}/reset-password`))
        .send({ newPassword: 'Hijack-pass-123' })
        .expect(403);
    });

    it('admin can still edit their own profile and manage ordinary staff', async () => {
      await asAdmin(http().patch(`/api/v1/users/${adminId}`))
        .send({ displayName: 'Troofn Admin' })
        .expect(200);
      const id = (await create(asAdmin, newStaffUser('e2e.ordinary')).expect(201)).body.data.id;
      await asAdmin(http().patch(`/api/v1/users/${id}`))
        .send({ displayName: 'Renamed' })
        .expect(200);
    });

    it('owner can create, edit and deactivate an admin', async () => {
      const id = await createAsOwner('e2e.owner.made', 'admin');
      await asOwner(http().patch(`/api/v1/users/${id}`))
        .send({ displayName: 'Renamed' })
        .expect(200);
      await asOwner(http().patch(`/api/v1/users/${id}`))
        .send({ status: 'INACTIVE' })
        .expect(200);
    });

    describe('the last active owner', () => {
      const prisma = () => app.get(PrismaService);
      // Each test switches off every other owner, so its own e2e owners are the only active ones.
      const deactivateOwnersExcept = (...usernames: string[]) =>
        prisma().user.updateMany({
          where: { role: { key: 'owner' }, username: { notIn: usernames } },
          data: { status: 'INACTIVE' },
        });
      afterEach(() =>
        prisma().user.update({ where: { username: 'owner' }, data: { status: 'ACTIVE' } }),
      );

      it('cannot be deactivated or demoted (409)', async () => {
        const id = await createAsOwner('e2e.last.owner', 'owner');
        await deactivateOwnersExcept('e2e.last.owner');
        // The seeded owner's access token is still valid until it expires: it acts as "another owner".
        const res = await asOwner(http().patch(`/api/v1/users/${id}`))
          .send({ status: 'INACTIVE' })
          .expect(409);
        expect(res.body.error.message).toBe('The system must keep at least one active owner');
        await asOwner(http().patch(`/api/v1/users/${id}`))
          .send({ role: 'admin' })
          .expect(409);
      });

      // Smoke test only: the two requests rarely overlap inside the database, so this also passes
      // without the advisory lock in assertNotLastOwner. It guards the outcome, not the locking.
      it('leaves one active owner when two owners deactivate each other', async () => {
        const a = await createAsOwner('e2e.race.a', 'owner');
        const b = await createAsOwner('e2e.race.b', 'owner');
        await deactivateOwnersExcept('e2e.race.a', 'e2e.race.b');
        const tokenA = (await login(app, 'e2e.race.a', 'Temp-pass-123')).accessToken;
        const tokenB = (await login(app, 'e2e.race.b', 'Temp-pass-123')).accessToken;

        const results = await Promise.all([
          http()
            .patch(`/api/v1/users/${b}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ status: 'INACTIVE' }),
          http()
            .patch(`/api/v1/users/${a}`)
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ status: 'INACTIVE' }),
        ]);
        expect(results.map((r) => r.status).sort((x, y) => x - y)).toEqual([200, 409]);
        const active = await prisma().user.count({
          where: { role: { key: 'owner' }, status: 'ACTIVE', deletedAt: null },
        });
        expect(active).toBe(1);
      });
    });
  });

  describe('GET /users filters', () => {
    it('filters by role and client', async () => {
      const res = await asAdmin(
        http().get(`/api/v1/users?clientId=${wejnadId}&role=client_accountant`),
      ).expect(200);
      expect(res.body.data.map((u: { username: string }) => u.username)).toEqual([
        'wejnad.accountant',
      ]);
    });
  });
});
