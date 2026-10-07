import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/database/index.js';
import {
  createTestApp,
  createTestUser,
  DEMO_PASSWORD,
  deleteTestUsers,
  login,
} from './helpers/app.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await deleteTestUsers(app);
  });

  afterAll(async () => {
    await deleteTestUsers(app);
    await prisma.client.updateMany({
      where: { code: 'TID00S2J' },
      data: { appAccessEnabled: true },
    });
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('returns tokens and the user profile with permissions', async () => {
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: DEMO_PASSWORD, platform: 'WEB' })
        .expect(200);

      const data = res.body.data;
      expect(data).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
      expect(data.accessToken).toEqual(expect.any(String));
      expect(data.refreshToken).toMatch(/^[0-9a-f-]{36}\.[\w-]+$/);
      expect(data.user).toMatchObject({ username: 'admin', role: 'admin', client: null });
      expect(data.user.permissions['users.read']).toBe('ALL');
    });

    it('never returns password or token hashes', async () => {
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ username: 'wejnad.owner', password: DEMO_PASSWORD })
        .expect(200);
      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/passwordHash|password_hash|refreshTokenHash|\$argon2/);
    });

    it('treats the username case-insensitively', async () => {
      await http()
        .post('/api/v1/auth/login')
        .send({ username: '  ADMIN ', password: DEMO_PASSWORD })
        .expect(200);
    });

    it('gives the same 401 for a wrong password and an unknown user', async () => {
      const wrong = await http()
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'Wrong-pass1' })
        .expect(401);
      const unknown = await http()
        .post('/api/v1/auth/login')
        .send({ username: 'nobody.here', password: 'Wrong-pass1' })
        .expect(401);
      expect(wrong.body.error.message).toBe('Invalid username or password');
      expect(unknown.body.error.message).toBe(wrong.body.error.message);
    });

    it('validates the body (400)', async () => {
      await http().post('/api/v1/auth/login').send({ username: 'admin' }).expect(400);
    });

    it('records the session with device details', async () => {
      const res = await http()
        .post('/api/v1/auth/login')
        .set('User-Agent', 'TroofnApp/1.0')
        .send({
          username: 'wejnad.marketing',
          password: DEMO_PASSWORD,
          platform: 'IOS',
          deviceName: 'iPhone 15 Pro',
        })
        .expect(200);
      const sessionId = res.body.data.refreshToken.split('.')[0];
      const session = await prisma.userSession.findUniqueOrThrow({ where: { id: sessionId } });
      expect(session).toMatchObject({
        platform: 'IOS',
        deviceName: 'iPhone 15 Pro',
        userAgent: 'TroofnApp/1.0',
        revokedAt: null,
      });
    });

    it('refuses users of an inactive client (403)', async () => {
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ username: 'nukhba.owner', password: DEMO_PASSWORD })
        .expect(403);
      expect(res.body.error.message).toMatch(/client/i);
    });

    it('refuses client users when the client has app access turned off (403)', async () => {
      await prisma.client.update({
        where: { code: 'TID00S2J' },
        data: { appAccessEnabled: false },
      });
      await http()
        .post('/api/v1/auth/login')
        .send({ username: 'jabr.owner', password: DEMO_PASSWORD })
        .expect(403);
      await prisma.client.update({ where: { code: 'TID00S2J' }, data: { appAccessEnabled: true } });
    });

    it('refuses an inactive user (403)', async () => {
      await createTestUser(app, { username: 'e2e.inactive', status: 'INACTIVE' });
      await http()
        .post('/api/v1/auth/login')
        .send({ username: 'e2e.inactive', password: DEMO_PASSWORD })
        .expect(403);
    });

    it('locks the account after 5 failed attempts (423), even with the right password', async () => {
      await createTestUser(app, { username: 'e2e.lockme' });
      for (let i = 0; i < 5; i++) {
        await http()
          .post('/api/v1/auth/login')
          .send({ username: 'e2e.lockme', password: 'Wrong-pass1' })
          .expect(401);
      }
      await http()
        .post('/api/v1/auth/login')
        .send({ username: 'e2e.lockme', password: DEMO_PASSWORD })
        .expect(423);
    });

    it('resets the failed-attempt counter after a successful login', async () => {
      const user = await createTestUser(app, { username: 'e2e.reset' });
      for (let i = 0; i < 3; i++) {
        await http()
          .post('/api/v1/auth/login')
          .send({ username: 'e2e.reset', password: 'Wrong-pass1' })
          .expect(401);
      }
      await login(app, 'e2e.reset');
      const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(row.failedLoginAttempts).toBe(0);
      expect(row.lastLoginAt).not.toBeNull();
    });
  });

  describe('GET /auth/me', () => {
    it('returns the current user with their permissions', async () => {
      const { accessToken } = await login(app, 'wejnad.accountant');
      const res = await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data).toMatchObject({
        username: 'wejnad.accountant',
        role: 'client_accountant',
        client: { code: 'TID00S1W' },
      });
      expect(res.body.data.permissions['invoices.read']).toBe('OWN_CLIENT');
      expect(res.body.data.permissions['sow.read']).toBeUndefined();
    });

    it('requires a token (401)', async () => {
      await http().get('/api/v1/auth/me').expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the pair: the new refresh token works, the old one no longer does', async () => {
      const first = await login(app, 'fahad.mm');
      const res = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(200);
      const second = res.body.data;
      expect(second.refreshToken).not.toBe(first.refreshToken);
      await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${second.accessToken}`)
        .expect(200);
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: second.refreshToken })
        .expect(200);
    });

    it('treats reuse of an old refresh token as theft and revokes the session', async () => {
      const first = await login(app, 'fahad.mm');
      const rotated = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(200);

      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(401);

      // The legitimate holder of the newest token is logged out too.
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rotated.body.data.refreshToken })
        .expect(401);
      const session = await prisma.userSession.findUniqueOrThrow({
        where: { id: first.refreshToken.split('.')[0] },
      });
      expect(session.revokeReason).toBe('TOKEN_REUSE');
    });

    it('rejects a malformed token (401)', async () => {
      await http().post('/api/v1/auth/refresh').send({ refreshToken: 'garbage' }).expect(401);
    });
  });

  describe('POST /auth/logout and /auth/logout-all', () => {
    it('logout revokes the current session only', async () => {
      const a = await login(app, 'abdullah.writer');
      const b = await login(app, 'abdullah.writer');
      await http()
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${a.accessToken}`)
        .expect(204);
      await http().post('/api/v1/auth/refresh').send({ refreshToken: a.refreshToken }).expect(401);
      await http().post('/api/v1/auth/refresh').send({ refreshToken: b.refreshToken }).expect(200);
    });

    it('logout-all revokes every session of the user', async () => {
      const a = await login(app, 'ahmed.employee');
      const b = await login(app, 'ahmed.employee');
      await http()
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${a.accessToken}`)
        .expect(204);
      await http().post('/api/v1/auth/refresh').send({ refreshToken: a.refreshToken }).expect(401);
      await http().post('/api/v1/auth/refresh').send({ refreshToken: b.refreshToken }).expect(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('rejects a wrong current password (400)', async () => {
      await createTestUser(app, { username: 'e2e.pw.wrong' });
      const { accessToken } = await login(app, 'e2e.pw.wrong');
      await http()
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'Not-it-123', newPassword: 'BrandNew123' })
        .expect(400);
    });

    it('rejects a weak new password (400)', async () => {
      await createTestUser(app, { username: 'e2e.pw.weak' });
      const { accessToken } = await login(app, 'e2e.pw.weak');
      await http()
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: DEMO_PASSWORD, newPassword: 'short' })
        .expect(400);
    });

    it('changes the password, returns fresh tokens and logs out other sessions', async () => {
      await createTestUser(app, { username: 'e2e.pw.ok' });
      const current = await login(app, 'e2e.pw.ok');
      const other = await login(app, 'e2e.pw.ok');

      const res = await http()
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${current.accessToken}`)
        .send({ currentPassword: DEMO_PASSWORD, newPassword: 'BrandNew123' })
        .expect(200);
      expect(res.body.data.accessToken).toEqual(expect.any(String));

      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: other.refreshToken })
        .expect(401);
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: res.body.data.refreshToken })
        .expect(200);
      await login(app, 'e2e.pw.ok', 'BrandNew123');
    });

    it('clears "must change password" and unblocks the user', async () => {
      await createTestUser(app, { username: 'e2e.pw.forced', mustChangePassword: true });
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ username: 'e2e.pw.forced', password: DEMO_PASSWORD })
        .expect(200);
      expect(res.body.data.user.mustChangePassword).toBe(true);

      // /auth/me stays reachable so the app can show the "change your password" screen.
      await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${res.body.data.accessToken}`)
        .expect(200);

      const changed = await http()
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${res.body.data.accessToken}`)
        .send({ currentPassword: DEMO_PASSWORD, newPassword: 'BrandNew123' })
        .expect(200);
      expect(changed.body.data.user.mustChangePassword).toBe(false);
    });
  });
});
