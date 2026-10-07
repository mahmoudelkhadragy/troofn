import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { type JwtPayload, Role } from '@troofn/shared';
import { TokenService } from './token.service.js';

const ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-chars';
const config = new ConfigService({
  auth: {
    accessSecret: ACCESS_SECRET,
    accessTtlSeconds: 900,
    refreshSecret: 'test-refresh-secret-that-is-at-least-32-chars',
    refreshTtlDays: 7,
  },
});

const payload: JwtPayload = {
  sub: '0199c3a0-0000-7000-8000-000000000001',
  role: Role.CLIENT,
  clientId: '0199c3a0-0000-7000-8000-0000000000c1',
  sid: '0199c3a0-0000-7000-8000-0000000000aa',
  mcp: false,
};

describe('TokenService', () => {
  const service = new TokenService(new JwtService({ secret: ACCESS_SECRET }), config as never);

  describe('access token', () => {
    it('round-trips the claims', async () => {
      const token = await service.signAccessToken(payload);
      await expect(service.verifyAccessToken(token)).resolves.toMatchObject(payload);
    });

    it('expires after the configured TTL', async () => {
      const token = await service.signAccessToken(payload);
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
      expect(claims.exp - claims.iat).toBe(900);
    });

    it('rejects a token signed with another secret', async () => {
      const forged = await new JwtService({ secret: 'x'.repeat(40) }).signAsync(payload, {
        issuer: 'troofn-api',
        audience: 'troofn-api',
      });
      await expect(service.verifyAccessToken(forged)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an expired token', async () => {
      const expired = await new JwtService({ secret: ACCESS_SECRET }).signAsync(
        { ...payload, exp: Math.floor(Date.now() / 1000) - 10 },
        { issuer: 'troofn-api', audience: 'troofn-api' },
      );
      await expect(service.verifyAccessToken(expired)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a token meant for another audience', async () => {
      const other = await new JwtService({ secret: ACCESS_SECRET }).signAsync(payload, {
        issuer: 'troofn-api',
        audience: 'something-else',
      });
      await expect(service.verifyAccessToken(other)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects garbage', async () => {
      await expect(service.verifyAccessToken('not.a.jwt')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('refresh token', () => {
    const sessionId = '0199c3a0-0000-7000-8000-0000000000aa';

    it('is "<sessionId>.<secret>" and the stored hash never contains the secret', () => {
      const { token, hash } = service.issueRefreshToken(sessionId);
      const [id, secret] = token.split('.');
      expect(id).toBe(sessionId);
      expect(secret.length).toBeGreaterThanOrEqual(43); // 32 random bytes, base64url
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash).not.toContain(secret);
    });

    it('parses its own tokens and matches the hash', () => {
      const { token, hash } = service.issueRefreshToken(sessionId);
      const parsed = service.parseRefreshToken(token);
      expect(parsed?.sessionId).toBe(sessionId);
      expect(service.refreshSecretMatches(parsed!.secret, hash)).toBe(true);
    });

    it('does not match a different secret', () => {
      const { hash } = service.issueRefreshToken(sessionId);
      const other = service.parseRefreshToken(service.issueRefreshToken(sessionId).token)!;
      expect(service.refreshSecretMatches(other.secret, hash)).toBe(false);
    });

    it.each(['', 'garbage', 'not-a-uuid.secret', `${'0'.repeat(36)}`, `${sessionId}.`])(
      'returns null for malformed token %j',
      (token) => {
        expect(service.parseRefreshToken(token)).toBeNull();
      },
    );

    it('expires after the configured number of days', () => {
      const now = new Date('2026-10-08T00:00:00Z');
      expect(service.refreshTokenExpiry(now).toISOString()).toBe('2026-10-15T00:00:00.000Z');
    });
  });
});
