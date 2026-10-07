import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '@troofn/shared';
import type { AppConfig } from '../../config/index.js';

const ISSUER = 'troofn-api';
const AUDIENCE = 'troofn-api';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Creates and checks the two kinds of tokens.
 *
 * - Access token: a signed JWT, valid for a few minutes, checked on every request
 *   without touching the database.
 * - Refresh token: `<sessionId>.<random secret>`. It is opaque (not a JWT); the
 *   database keeps only an HMAC of the secret, so a leaked DB can't be used to log in.
 */
@Injectable()
export class TokenService {
  private readonly auth: AppConfig['auth'];

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.auth = config.get('auth', { infer: true });
  }

  get accessTokenTtlSeconds(): number {
    return this.auth.accessTtlSeconds;
  }

  signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwt.signAsync(
      { ...payload },
      {
        secret: this.auth.accessSecret,
        expiresIn: this.auth.accessTtlSeconds,
        issuer: ISSUER,
        audience: AUDIENCE,
      },
    );
  }

  /** Throws 401 for a forged, expired or foreign token. */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const claims = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.auth.accessSecret,
        issuer: ISSUER,
        audience: AUDIENCE,
      });
      return {
        sub: claims.sub,
        role: claims.role,
        clientId: claims.clientId ?? null,
        sid: claims.sid,
        mcp: claims.mcp === true,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  issueRefreshToken(sessionId: string): { token: string; hash: string } {
    const secret = randomBytes(32).toString('base64url');
    return { token: `${sessionId}.${secret}`, hash: this.hashRefreshSecret(secret) };
  }

  parseRefreshToken(token: string): { sessionId: string; secret: string } | null {
    const dot = token.indexOf('.');
    if (dot < 0) return null;
    const sessionId = token.slice(0, dot);
    const secret = token.slice(dot + 1);
    if (!UUID.test(sessionId) || !secret) return null;
    return { sessionId, secret };
  }

  /** Constant-time comparison, so response timing leaks nothing about the hash. */
  refreshSecretMatches(secret: string, storedHash: string): boolean {
    const actual = Buffer.from(this.hashRefreshSecret(secret), 'hex');
    const expected = Buffer.from(storedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  refreshTokenExpiry(from: Date = new Date()): Date {
    return new Date(from.getTime() + this.auth.refreshTtlDays * DAY_MS);
  }

  private hashRefreshSecret(secret: string): string {
    return createHmac('sha256', this.auth.refreshSecret).update(secret).digest('hex');
  }
}
